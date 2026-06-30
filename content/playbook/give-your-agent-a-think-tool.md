---
title: "Give Your Agent a Think Tool"
date: "2026-06-26"
summary: "Invisible reasoning is undebuggable reasoning — make the model commit its logic to a structured tool call you can log, trace, and grep."
tags: ["agents", "observability", "debugging"]
status: published
author: "Bharath"
---

The model already has space to reason between tool calls — that prose lives in assistant turns. So why add a dedicated `think` tool?

Because invisible reasoning is undebuggable reasoning.

When the model thinks in prose before a tool call, that thinking is not captured in your tool call records, invisible unless you're streaming the full completion, potentially discarded when context gets compacted, and unstructured enough that you can't filter or index it. A `think` tool changes all of that. The model calls it explicitly, passing its reasoning as a string argument. Your infrastructure records it like any other tool call. You can grep for it in traces, emit it as a structured event, and exclude it from context compaction without losing the decisions it drove.

Here's the tool definition:

```python
think_tool = {
    "name": "think",
    "description": (
        "Use this to work through a complex decision before calling other tools. "
        "Write out your reasoning explicitly. This call has no side effects."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "reasoning": {"type": "string"}
        },
        "required": ["reasoning"]
    }
}
```

The implementation is trivial:

```python
def handle_think(reasoning: str, trace_id: str) -> dict:
    logger.info("agent_think", reasoning=reasoning, trace_id=trace_id)
    return {"status": "ok"}
```

That's it. The model writes its logic into a structured field; your logging pipeline captures it; your trace viewer shows it alongside the actual tool calls that followed.

## When it earns its place

Not every agent needs this. Add it when:

**The task involves interdependent decisions.** Multi-step migrations, code refactoring pipelines, financial report generation — anything where an early misjudgment compounds downstream. The explicit reasoning step forces the model to surface its assumptions before it acts on them.

**You're debugging silent failures.** When your agent calls the wrong tool or produces bad output and you can't tell why, a `think` call gives you the model's internal state at decision time. You don't have to reconstruct intent from a sequence of tool calls after the fact.

**You're tuning prompts.** You can compare `think` call contents across prompt versions to see *how* the model's interpretation changed, not just whether the final output changed. It's the difference between A/B testing a black box and watching what the model actually understood.

## What to watch out for

The model will sometimes chain multiple `think` calls before acting. That's fine in moderation, but a runaway reasoning loop burns tokens fast. Add `think` to your loop detector and cap it at three to five calls before any substantive action in the same turn.

Don't put `think` first in your tool list either. If the model sees it at position zero, it'll call it reflexively on every turn as a warm-up tic. Put it last, after the tools most relevant to the current phase.

## Why this works

A tool call is a commitment. Prose between turns is cheap. When you make reasoning a tool call, the model treats it more like a deliberate act — it knows you're capturing the result and that it's on the record. That shift in posture, subtle as it is, measurably improves accuracy on tasks where the failure mode is acting before thinking.

Make the model show its work. You'll ship fewer mysterious bugs and debug the ones that slip through in a fraction of the time.
