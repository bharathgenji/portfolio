---
title: "A Forced Tool Choice Doesn't Know When the Task Is Over"
date: "2026-09-19"
summary: "Force a tool call on turn one to guarantee structured output, forget to release it, and the model fabricates tool calls on every turn after the task is already done."
tags: ["agents", "reliability", "tool-design"]
status: draft
author: "Bharath"
---

## The extra call nobody asked for

A team forced tool use on the first turn of an extraction agent — `tool_choice={"type": "tool", "name": "extract_fields"}` — specifically to stop the model from responding with a chatty paragraph instead of structured JSON. It worked. The same request config, copied into the loop that handled every subsequent turn, also worked in the sense that it never crashed. What it did instead was call `extract_fields` again on turn two, and turn three, and every turn after that, quietly re-extracting fields from context that hadn't changed, because the model was never allowed to do anything else. Nobody noticed until someone diffed the tool-call log against the actual task length and found triple the calls a normal run should need.

## `tool_choice` isn't a preference, it's a constraint

`tool_choice: auto` lets the model pick between calling a tool and returning text. `tool_choice: any` or `tool_choice: {"type": "tool", "name": ...}` removes that choice entirely — the response *must* contain a tool_use block, full stop. That's the entire point when you use it: on turn one, before the model has any tool results to reason about, forcing a specific call is a legitimate way to skip a wasted round of "let me think about this" and get straight to the extraction, the search, or whatever kicks off the task.

The failure mode isn't using it — it's treating it as a static field on the request object instead of a one-shot instruction. If the same `tool_choice` value rides along in every call your loop makes, the model is forced to emit a tool call on the turn where the task is actually finished and the correct output is a plain-text answer or a call to your done tool ([[give-your-agent-a-done-tool]]). It can't refuse. It can't say "nothing left to do." It picks the least-wrong tool available and invents plausible-looking arguments to satisfy the schema, because that's the only response shape the API will accept from it.

## Scope it to the turn, not the session

```python
def call_model(messages, turn_index):
    choice = (
        {"type": "tool", "name": "extract_fields"}
        if turn_index == 0
        else "auto"
    )
    return client.messages.create(
        model=MODEL, tools=tools, tool_choice=choice, messages=messages,
    )
```

Treat `tool_choice` overrides like a latch that resets after the call they were meant for, not a loop-invariant config value. If you force a tool anywhere past turn one — say, to guarantee a final structured summary — make that a deliberate, explicit switch back to forced mode for exactly that call, then release it again immediately after.

## Test the finished state, not just the happy path

Most evals for this pattern check that the forced call on turn one produces valid output. Add a case that runs the agent to actual completion and asserts no tool call fires after the done signal, or after the last turn where one was needed. A forced choice that never gets released is invisible in a two-turn test and produces a steady stream of spurious, billed tool calls in anything longer.
