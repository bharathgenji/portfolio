---
title: "Parallel Tool Calls Over One MCP Connection Still Run One at a Time"
date: "2026-09-05"
summary: "You gather() three tool calls to the same MCP server expecting them to overlap, and the trace shows them lined up end to end instead — the pipe was never the parallel part."
tags: ["agents", "mcp", "concurrency"]
status: draft
author: "Bharath"
---

## The gather() that didn't speed anything up

The model emits three independent `tool_use` blocks in one turn, you [[parallel-tool-calls|dispatch them with `asyncio.gather()`]] instead of a loop, and p95 latency doesn't move. The trace tells you why: three calls to the same MCP server, each one starting the instant the previous one finished. Not concurrent. Sequential, just without the `await` in your own code to blame.

The bug isn't in your dispatch code. It's one layer down, in the MCP transport.

## One stdio pipe, one request at a time

A stdio-based MCP server is a single child process talking JSON-RPC over its stdin/stdout. That's one duplex pipe per server instance. Whether two requests sent down that pipe actually run concurrently depends entirely on the server's own dispatch loop — and a lot of MCP servers, especially ones people write quickly for an internal tool, read one message, handle it fully (including any blocking I/O inside the handler), write the response, and only then read the next message. The JSON-RPC spec lets you correlate responses to requests by `id` out of order; it does not require the server to process them out of order, and plenty of reference implementations don't bother, because it wasn't slow enough for anyone to notice with one caller.

Your client-side SDK can make this worse independently. Some MCP client libraries queue writes to the pipe and won't send request N+1 until request N's response arrives, regardless of how "concurrently" your application code issued them. In that case even a server that could handle interleaved requests never gets the chance.

## Diagnose it before you touch the transport

Don't assume — log wall-clock start and end per call and look at whether the intervals actually overlap:

```python
async def call_mcp_tool(session, name, args):
    t0 = time.monotonic()
    result = await session.call_tool(name, args)
    log.info("mcp_call", tool=name, start=t0, dur=time.monotonic() - t0)
    return result
```

Three calls with back-to-back, non-overlapping intervals is the serialization signature. Three calls with overlapping intervals but no latency improvement is a different bug entirely — probably a bulkhead or a downstream rate limit ([[put-a-bulkhead-in-front-of-shared-tools]]) — and treating it as a transport issue will waste an afternoon.

## Pool connections, don't just pool hope

If the server is stateless per call, run N of it and route each parallel `tool_use` to a different instance, round-robin — the same shape as a database connection pool, sized to your expected fan-out rather than to whatever number felt safe:

```python
class MCPPool:
    def __init__(self, spawn_fn, size):
        self.sessions = [spawn_fn() for _ in range(size)]
        self._next = 0

    def acquire(self):
        s = self.sessions[self._next % len(self.sessions)]
        self._next += 1
        return s
```

If the server wraps something genuinely stateful — a single browser tab, a single git worktree, a single open transaction — pooling doesn't apply, and that's a real limit, not a bug to fix. Mark that tool as non-concurrent in your orchestrator explicitly, the same way you'd flag any [[stateful-tools-need-sticky-sessions|tool whose state doesn't survive load-balancing]], instead of discovering the ceiling from a flat p95 graph six months in.
