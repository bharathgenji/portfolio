---
title: "Set a Hard Timeout on Every Tool Call"
date: "2026-06-10"
summary: "One slow external call can hang your agent indefinitely — and the failure is silent, so you won't know until a user complains."
tags: ["agents", "reliability", "production"]
status: published
author: "Bharath"
---

## The failure mode nobody talks about

You launch an agent. It plans, calls a tool, and then... nothing. No error. No response. Just silence.

The tool hit a flaky API endpoint. The connection hung. TCP keepalive hasn't fired yet. Your agent is waiting politely, burning your user's time, with no way to tell you it's stuck.

This isn't hypothetical. Every external tool call — database queries, HTTP fetches, file reads on a mounted volume, subprocess calls — can hang indefinitely. And because LLM inference itself is fast, a single 30-second timeout on the agent *loop* won't save you: the tool executor is blocking synchronously before the model ever sees the result.

## Wrap every tool in a timeout

The fix is mechanical. In Python:

```python
import asyncio

async def with_timeout(coro, seconds: float, tool_name: str):
    try:
        return await asyncio.wait_for(coro, timeout=seconds)
    except asyncio.TimeoutError:
        return {"error": "tool_timeout", "tool": tool_name, "after_seconds": seconds}
```

Return a structured error rather than raising. The agent can then decide whether to retry, skip, or escalate — but it stays in control. Raising an exception kills the entire agent turn; returning an error keeps the agent loop alive and puts the recovery decision where it belongs: in the model.

## Pick timeouts by tool class, not one global value

A global 30-second timeout is too coarse. Use tiers:

- **Read/lookup tools** (cache reads, primary DB queries): 2–5s. These should be fast; if they're not, something upstream is broken.
- **External API calls**: 10–15s. HTTP endpoints vary. Budget for a slow third-party.
- **Subprocess/shell tools**: 30–60s. Give scripts and builds room, but not infinite room.
- **File I/O on mounted volumes**: 10s. Network-attached storage stalls without warning.

Bake these defaults into your tool registry at registration time. Don't rely on callers to remember to pass a timeout.

## Track wall-clock time across the whole run

Per-tool timeouts prevent single-call hangs. They don't help if your agent makes 20 slow-but-within-limit calls in sequence.

Track elapsed time from the start of each agent turn:

```python
import time

class TurnBudget:
    def __init__(self, total_seconds: float):
        self.deadline = time.monotonic() + total_seconds

    def remaining(self) -> float:
        return max(0.0, self.deadline - time.monotonic())

    def expired(self) -> bool:
        return self.remaining() <= 0.0
```

Before each tool call, check `budget.expired()`. If you're past the wall-clock deadline, return an error immediately rather than letting the agent start another slow call it can't finish. Clamp each per-tool timeout to `min(tool_default, budget.remaining())` so the last call in a tight turn doesn't get a 15-second window it was never going to use.

## The thing you skip when you're moving fast

Adding timeouts feels like plumbing. It's not exciting. You think about connection pools, retry logic, observability — and timeouts feel too obvious to bother with.

Then a user reports their agent "just stopped" mid-task, and you spend an hour in logs before you realize it's been waiting on a stalled database cursor for 40 minutes.

Every tool call is a trust boundary with something you don't control. Set the timeout before you ship, not after.
