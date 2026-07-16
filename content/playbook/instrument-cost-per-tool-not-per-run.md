---
title: "Instrument Cost Per Tool, Not Per Run"
date: "2026-07-15"
summary: "A total cost-per-run number tells you the bill is too high; it never tells you which of your fourteen tools is the reason."
tags: ["agents", "cost", "observability"]
status: published
author: "Bharath"
---

## The dashboard that can't answer the question

You have a cost-per-run metric. It's going up. Finance wants to know why. You don't know, because "cost per run" is a sum, and a sum has already thrown away the information you need to act on it. Was it the retrieval tool making six calls instead of two? The web-search tool returning pages so large they blow up the next model call's input tokens? A summarizer tool that got looped into calling itself? All you can see is that the total went from $0.06 to $0.19, and every hypothesis is equally unfalsifiable from where you're standing.

Run-level budgets ([[give-every-agent-run-a-token-budget]]) stop a single run from running away. They don't tell you which *tool* is structurally expensive across every run, which is the thing you actually need to know to fix the bill.

## Attribute cost at the call site, not the run boundary

The fix is cheap: wrap tool execution once, tag every cost record with the tool name, and let the aggregation happen downstream instead of trying to reason about it in your head.

```python
def execute_tool(tool_name: str, args: dict, run_id: str) -> dict:
    t0 = time.monotonic()
    result = registry[tool_name].run(args)
    cost_log.emit({
        "run_id": run_id,
        "tool": tool_name,
        "input_tokens": result.usage.input_tokens,
        "output_tokens": result.usage.output_tokens,
        "wall_ms": (time.monotonic() - t0) * 1000,
        "dollars": estimate_cost(tool_name, result.usage),
    })
    return result
```

Nothing about this requires foresight into which tool will turn out to be the problem — that's the point. You emit the same record shape for every tool, unconditionally, and the expensive one shows up in the aggregation whether or not you predicted it.

## What the breakdown tells you that the sum can't

Group by `tool` and percentile the dollar cost. In practice this surfaces three failure modes, in this order of frequency:

**One tool dominates.** Usually it's whichever tool returns the most raw text — a search or scrape tool — because its output becomes input tokens on every subsequent model call in the run. The fix isn't cheaper search, it's truncating or summarizing the tool result before it re-enters context (see [[cap-your-tool-results]]).

**One tool has a long tail.** Median cost is fine, p99 is 40x the median. That's not a pricing problem, it's a specific input shape — a huge document, a pathological query — hitting a tool that doesn't degrade gracefully. You won't find this by looking at averages; you'll only find it by looking at the distribution per tool.

**A tool gets called more than the task justifies.** Not expensive per call, expensive in aggregate because the agent invokes it eight times when two would do. This is a prompting or tool-design problem, not a pricing problem, and per-tool call-count is what reveals it — total cost alone just looks like "somewhat elevated."

## Ship it before you need it

Add the wrapper before the cost problem shows up, not after. Retrofitting attribution onto a production incident means correlating logs after the fact, which is slower and less certain than having the breakdown already sitting in a dashboard. The wrapper is a dozen lines. The alternative is guessing which of fourteen tools to optimize first, and guessing wrong.
