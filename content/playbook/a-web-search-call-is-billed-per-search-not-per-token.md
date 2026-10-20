---
title: "A Web Search Call Is Billed Per Search, Not Per Token"
date: "2026-10-20"
summary: "Server-side tools like web search and code execution run outside the completion, so their cost doesn't show up in the input/output token counts your dashboard is watching."
tags: ["agents", "cost", "tools"]
status: draft
author: "Bharath"
---

## The dashboard said $400, the invoice said $1,900

A research agent calls a web search tool a few times per task, reads the results, and answers. The team's cost dashboard sums `usage.input_tokens` and `usage.output_tokens` off every response and multiplies by the per-token rate — standard setup, works fine for a plain chat agent. For this agent it was off by 4-5x every month, and nobody could find the leak in the token math because the token math was correct. It just wasn't the whole bill.

Server-side tools don't run in your process. When the model wants to search the web or execute code, the provider runs that action on its own infrastructure and hands back a result block, which *does* get billed as input tokens the next time it's in context — but the search itself, or the compute time for the execution sandbox, is metered separately and doesn't appear anywhere in the token usage object. A web search tool is commonly billed per call, flat, regardless of how many tokens the results compress to. A code execution tool is commonly billed by container time — session-seconds the sandbox is alive, not seconds of code actually running. An agent that calls search eight times to triple-check an answer, or that keeps a code execution session open across a ten-step analysis, is accumulating cost that a token-based dashboard has no column for.

## Why it hides so well

Everything downstream looks normal. The transcript shows search results and code output like any other tool result. The token counts in the API response are accurate for what they measure. The only way to see the gap is to look at what the provider's own usage/billing export says versus what your internal dashboard computed from completion usage — and most teams don't reconcile those until the invoice forces them to.

## Meter the thing that's actually metered

Stop inferring server-tool cost from token counts. Log the actual unit the provider bills on, per call:

```python
def log_tool_cost(response):
    for block in response.content:
        if block.type == "server_tool_use":
            metrics.increment(f"tool_calls.{block.name}", tags={"task_id": task_id})
        if block.type == "code_execution_tool_result":
            metrics.record("code_exec.session_seconds", block.session_duration_s)
```

Then price those counters against the provider's actual server-tool rate card, separately from your per-token completion cost. The two should be added, not conflated — a dashboard that only shows one of them isn't wrong, it's just answering half the question.

## Close sessions you're not using

If code execution is billed by container uptime, don't leave a session open across tool calls "just in case" the agent needs it again. Close it the moment the agent's done with that step and reopen one when it's actually needed. An idle sandbox between an agent's first and fifth tool call in a long chain is paying rent on compute nobody's using — the same shape of waste as leaving a mic open on silence, just metered in container-seconds instead of audio-seconds.
