---
title: "A Fan-In Step Needs a Merge Strategy, Not Last-Write-Wins"
date: "2026-10-21"
summary: "Fan out four subagents to build one shared report and whichever one finishes last quietly erases the other three's work — not because it's wrong, but because the merge was never designed."
tags: ["agents", "multi-agent", "reliability"]
status: draft
author: "Bharath"
---

## The report that lost two of its four sections

A research orchestrator fans out four subagents in parallel — financials, leadership, market position, risks — each one asked to research its slice and write its findings into a shared `report_state` object. The fan-in step is one line: each subagent's result gets merged back with `state.update(result)`. Three subagents finish within a second of each other; the fourth takes eleven seconds because its tool calls hit a slow API. When the orchestrator reads `report_state` after the barrier, the risks section is there. Leadership and market position are gone. Nobody touched them — they were simply overwritten.

The bug isn't in any subagent. It's that `state.update()` was never a merge. Each subagent read the state object before it started, held its *own* snapshot for the whole run, and wrote back that snapshot plus its addition when it finished. The three fast subagents all read the same near-empty starting state, each appended one field to their private copy, and each wrote their copy back — so the last one to write wins, and its copy only ever contained its own field. The other two fields never existed anywhere except in memory that got discarded the moment a later write landed.

## Why this slips through review

Fan-out code gets tested the way it's written: run one subagent, check its output, looks right. Run the full fan-out in a demo with fast, uniform latency and the race window is too small to trigger — everything finishes close enough together that the discrepancy doesn't show up until production traffic introduces the latency variance that actually exposes it. By the time someone notices a section is missing, the logs show four successful subagent runs and no error anywhere. The data loss is silent because nothing failed.

## Give each writer its own slot, not a shared one

```python
# Before: subagents merge into one shared object — races on overlap
report_state.update(subagent_result)

# After: each subagent owns a namespace; fan-in is concatenation, not merge
report_state["sections"][subagent.name] = subagent_result
```

If every subagent writes to a key nobody else touches, there's nothing to reconcile — the fan-in step is just collecting namespaces, and write order stops mattering. This is the right fix whenever subagents are genuinely partitioning work, which is most fan-outs.

## When the overlap is real, merge explicitly

Sometimes two subagents *should* both touch the same field — two editors revising the same summary paragraph, say. There, namespacing hides the problem instead of solving it. Treat it like a version-control merge: have each subagent return a patch against the state it started from, not a full replacement, and apply patches through a function that knows how to combine or flag conflicting edits to the same field. "Last write wins" is a default you get for free when you don't think about it — it's never a decision anyone actually made.
