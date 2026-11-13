---
title: "Shadow Your Tool Swaps, Not Just Your Agent"
date: "2026-11-13"
summary: "Shadowing a whole new agent version to validate one tool swap doubles your inference bill and buries the signal you actually need under model noise you don't."
tags: ["agents", "tooling", "reliability"]
status: draft
author: "Bharath"
---

## The migration that didn't need a new agent version

A team moved their `search_orders` tool from a Postgres full-text query to a vector index — same signature, same return shape, supposedly a drop-in swap. They reached for the standard playbook: stand up a candidate agent version with the new tool, shadow it against real traffic, compare decisions, ramp. Two days later they had a pile of decision diffs and no idea what caused any of them, because the candidate wasn't just running a different tool — it was also subject to whatever the model's ordinary run-to-run variance looks like. Some diffs were the new index returning worse results. Some were just the model picking a different phrasing on a repeated call. Shadowing the whole agent to validate a single tool change buys you noise on top of signal, and you pay double inference cost for it.

## Shadow at the tool boundary, not the agent boundary

If the model, the prompt, and every other tool are unchanged, don't re-run the agent twice. Run the *tool* twice, inside a single live call, and keep the model blind to one of the two results:

```python
async def search_orders(query: str, **kwargs):
    live_result = await search_orders_postgres(query, **kwargs)

    asyncio.create_task(
        shadow_call(search_orders_vector, query, kwargs, live_result)
    )

    return live_result  # the model only ever sees this

async def shadow_call(candidate_fn, query, kwargs, live_result):
    try:
        candidate_result = await candidate_fn(query, **kwargs)
        log_tool_diff(
            tool="search_orders",
            query=query,
            live=live_result,
            candidate=candidate_result,
        )
    except Exception as e:
        log_tool_shadow_error("search_orders", query, e)
```

Fire the shadow call with `create_task`, don't `await` it before returning — the candidate's latency, including a cold vector index or a slow migration script, must never show up on the live request's critical path. That's the one rule this pattern adds on top of agent-level shadowing: a slow shadow tool is tolerable, a slow shadow *agent run* usually isn't, because you're not blocking on it at all.

## Diff the structure, not the prose

Tool outputs are usually structured — rows, IDs, scores — so diff them as structured data: same result set, same top-K order, same IDs with different scores. Log a divergence rate per field, not a single boolean "matched." A vector search that returns the same order IDs in a different ranking is a tuning problem; one that returns a different set of IDs entirely is a correctness problem, and those need different fixes.

## The side-effect trap is sharper here than at the agent level

Agent-level shadowing simulates tool calls with a dry-run flag by default, so a candidate agent version can't accidentally charge a card. Tool-level shadowing has no such guardrail unless you add one yourself — the candidate function is a real function you're calling for real. If the tool you're swapping writes anything, wrap the candidate in the same dry-run path from [Give Your Agent a Dry-Run Mode](/playbook/give-your-agent-a-dry-run-mode) before you ever let it run in shadow. A read-only search swap is safe to shadow as-is; a payment-routing swap is not, and the boundary you're shadowing doesn't make that distinction for you.

## Graduate the tool, not the agent

Once the divergence rate holds steady and low across a real traffic window, flip the live call to the candidate and delete the shadow branch. You never touched the agent version, the prompt, or the eval suite — because none of those changed. Decoupling tool rollout from agent rollout means you can ship tool swaps on their own cadence instead of bundling every one into the next full agent version you're brave enough to shadow.
