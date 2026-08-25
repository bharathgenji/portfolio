---
title: "Tool Order Is a Hidden Prior"
date: "2026-08-21"
summary: "Two tools that do almost the same thing get picked unevenly based on where they sit in the array — and the position, not the prompt, is deciding."
tags: ["agents", "tools", "reliability"]
status: published
author: "Bharath"
---

## The tool that kept losing

An agent had two search tools: `search_internal_docs` and `search_knowledge_base`, added six months apart by different people, overlapping in scope but not identical. Support tickets referencing internal runbooks kept resolving with knowledge-base results that technically answered the question but missed the runbook that would've closed the ticket faster. Nobody had touched the prompt. Nobody had touched the tool descriptions. What had changed was a refactor that alphabetized the tool array — and `search_internal_docs` moved from first to second.

That's the whole bug. Given two tools with genuinely overlapping applicability, the model isn't reading both descriptions and picking the better match every time — it's got a measurable lean toward whichever one it sees first in the list, the same primacy effect you'd get from few-shot examples or multiple-choice options presented in a fixed order. It's not huge on any single call. Across ten thousand calls a week, it's a bias baked into your resolution rate that no one is looking for, because everyone's first instinct when routing looks wrong is to reread the tool descriptions, not the array order.

## Test for it before you ship overlapping tools

If two tools can plausibly both apply to the same request, don't guess whether order matters — measure it.

```python
def selection_distribution(task: str, tool_a: dict, tool_b: dict, n=20) -> dict:
    counts = {"a_first": 0, "b_first": 0}
    for _ in range(n):
        r1 = agent_call(task, tools=[tool_a, tool_b])
        r2 = agent_call(task, tools=[tool_b, tool_a])
        counts["a_first"] += (r1.tool_name == tool_a["name"])
        counts["b_first"] += (r2.tool_name == tool_a["name"])
    return counts
```

If `a_first` and `b_first` land nowhere near each other on tasks where either tool is a defensible choice, order is doing part of the routing for you. That's not a hypothetical edge case worth a footnote — it's the reason two tools with real scope overlap need to either get merged, get disambiguated in their descriptions, or get a deterministic tie-break you chose on purpose instead of one an alphabetizer chose for you.

## The fix isn't "randomize the order"

The instinct once you've found this is to shuffle tool order per call so the bias distributes evenly across sessions instead of consistently favoring one tool. Don't — a shuffled tool array is a different prefix on every request, and you've just broken prompt caching on your tool schemas along with anything downstream of them ([[your-tool-list-is-part-of-the-cache-prefix]]). You'd be trading a routing bias you can measure and correct for a cache miss rate you'll be debugging separately next month.

Fix it at the source instead: dedupe overlapping tools where you can, sharpen descriptions so the boundary between them is explicit rather than inferred, and where two tools are meant to overlap on purpose, put the one you want to win, first, and leave it there. A fixed, deliberate order is a design decision. An alphabetized or historically-accumulated order is a coin flip wearing a schema.

## The tell

If your tool descriptions look unambiguous on paper but routing still skews toward one tool over another on cases where both apply, don't keep rewriting the descriptions. Swap the order and rerun the same cases. If the skew flips with it, the description was never the problem.
