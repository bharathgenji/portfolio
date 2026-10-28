---
title: "Return Tool Results in Call Order, Not Completion Order"
date: "2026-10-28"
summary: "A thread pool returns tool results in whatever order finishes first — reorder them back to the call sequence before you serialize, or you'll bust your cache on every turn that happens to race differently."
tags: ["agents", "caching", "tool-calling"]
status: draft
author: "Bharath"
---

## The cache hit rate that moved for no reason

A team had [[parallel-tool-calls]] working correctly: the model issued three independent tool calls in one turn, the executor ran them concurrently, and the agent kept moving. Correctness was never the issue — every `tool_result` block carried the right `tool_use_id`, and the model matched them up fine regardless of position. What nobody noticed for a while was that the *next* turn's prompt prefix — the one that included this turn's tool calls and results, now sitting earlier in the conversation — had a different cache hit rate depending on which of the three tools happened to be slowest that particular run.

The executor was built on `concurrent.futures.as_completed`, which yields futures as they finish, not in the order they were submitted. Three tools with variable latency — one hits a fast cache, one hits a slow downstream API, one depends on network conditions — finish in a different order almost every run. The code appended each result to a list as it arrived, then serialized that list straight into the `tool_result` content blocks. Same three tools, same three outputs, three different byte sequences depending on which API felt like responding first.

## Matching by ID doesn't mean order doesn't matter

The model-facing contract is real: providers match `tool_result` blocks to `tool_use` blocks by `tool_use_id`, not by position, so the turn is semantically correct no matter what order you return results in. But `cache_control` doesn't know about that contract — it hashes the literal token sequence. Two turns with the identical three tool calls and identical three results, serialized in a different order, are two different prefixes as far as the cache is concerned. This is the same failure shape as [[score-sorted-retrieval-silently-busts-your-prompt-cache]]: the *set* is stable, the *order* isn't, and caching only rewards the former if you force it to.

It gets worse if you ever route the same turn through a fallback provider that *is* strict about position-based matching rather than ID-based — see [[a-fallback-provider-doesnt-speak-your-primary-providers-tool-call-dialect]]. A reorder that's merely expensive on your primary provider can be an outright error on the fallback.

## Sort back to call order before you serialize

Execute however is fastest. Serialize in the order the calls were made:

```python
async def run_tools(tool_calls: list[ToolCall]) -> list[ToolResult]:
    tasks = [execute_tool(tc.name, tc.arguments) for tc in tool_calls]
    results = await asyncio.gather(*tasks)  # preserves input order
    return [
        {"tool_use_id": tc.id, "content": str(result)}
        for tc, result in zip(tool_calls, results)
    ]
```

`asyncio.gather` already does this correctly — it returns results aligned with the input list regardless of completion order, which is why the example in [[parallel-tool-calls]] is safe as written. The bug shows up specifically when someone swaps that for a completion-ordered primitive — `as_completed`, a thread pool's `Future` callbacks, a queue drained as workers finish — for what looks like the same reason (don't block on the slowest call) but silently drops the ordering guarantee along the way.

If you're stuck with a completion-ordered primitive for some other reason, carry the original index through and sort on it before building the content array:

```python
results = [None] * len(tool_calls)
for i, result in as_completed_with_index(tool_calls):
    results[i] = result
```

## The rule

Concurrency is about when work finishes, not about what order you're allowed to report it in. Any executor that lets completion order leak into serialization order is handing your cache a coin flip it didn't ask for. Fix it once, at the point where results get turned into content blocks, and the next turn's prefix stops depending on whose API felt slow that day.
