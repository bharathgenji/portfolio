---
title: "Thinking Blocks Travel With Their Tool Call"
date: "2026-08-10"
summary: "Extended thinking output looks like disposable scratch text, but strip it out of a multi-turn tool-use history and the next call either breaks or gets measurably dumber."
tags: ["agents", "context-management", "reliability"]
status: draft
author: "Bharath"
---

## The trim that looked free

A team running extended thinking noticed their tool-use transcripts had ballooned — some assistant turns carried a thousand tokens of reasoning before a two-argument tool call. Someone wrote a context trimmer: keep the tool calls and their results, drop the thinking blocks in between. Fewer tokens, same tool calls, seemingly the same behavior. Two things happened next. On the strict API path, the very next turn came back with a 400 — signature mismatch. On a path that tolerated missing thinking blocks, no error at all, just a quiet drop in multi-step task accuracy that took a week to notice, because nothing was crashing.

## Why thinking isn't scratch text

A thinking block that precedes a tool call isn't commentary about the tool call — it *is* the reasoning that produced it, and the two are cryptographically bound. The block ships with a signature field the API uses to verify it hasn't been altered since the model produced it. Edit a character, reorder it, or drop it while keeping the tool call that followed, and you've broken a chain the model needs to pick back up correctly on the next turn: it's not re-deriving the tool call's rationale from the tool result, it's continuing from where the thinking left off.

This is a stricter version of a rule you already apply elsewhere: a tool call and its result are one atomic unit ([[a-tool-call-and-its-result-are-one-unit]]). Extended thinking pushes that unit one step earlier — thinking, tool call, and tool result are now a three-part unit, and none of the three can be pruned without the other two.

## What this means for compaction

If you compact context mid-run ([[compact-agent-context-mid-run]]), the boundary you're allowed to cut at is the *whole turn*, never inside one:

```python
def safe_prune_boundary(turns: list[Turn]) -> int:
    # Never cut between a thinking block and the tool_use that follows it,
    # or between a tool_use and its tool_result.
    for i, turn in enumerate(turns):
        if turn.has_thinking or turn.has_pending_tool_result:
            continue  # not a safe cut point
        return i
    return 0
```

Treat blocks from the API response as opaque — store and replay the exact bytes you received, don't reserialize them through your own JSON encoder, don't strip fields you assume are unused. "Unused" fields are frequently exactly the signature that makes the block valid on replay.

## The budget nobody accounts for

Thinking tokens are billed and count against context, but they're invisible in the rendered output unless you specifically surface them. If your token budget ([[give-every-agent-run-a-token-budget]]) is sized off the visible transcript, you'll consistently underestimate real usage on any agent doing multi-step tool use with extended thinking on. Measure from the raw API response, not from what you show the user.

## The rule

Extended thinking output isn't the model's private notebook you can shred for space — it's load-bearing state, signed and non-negotiable. Prune whole turns or none at all.
