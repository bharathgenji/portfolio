---
title: "Give Your Agent a Done Tool"
date: "2026-06-20"
summary: "Make task completion explicit: a small tool the agent must call to terminate saves you from parsing prose for a finish signal."
tags: ["agents", "reliability", "tool-design"]
status: published
author: "Bharath"
---

## The Problem

When an agent finishes a task, it typically just... stops generating. It might say "I've completed the analysis" or "The file has been updated." Maybe it emits a JSON blob. Maybe it says nothing and you infer completion from the absence of more tool calls.

This is fragile. You end up parsing prose to detect completion, diffing tool call logs to see if anything changed, or waiting for a timeout. When something goes wrong — the agent looped, hit an error mid-run, or quit early — you often can't tell from the outside whether it succeeded or gave up.

## The Pattern

Give every agent a `task_complete` tool. Make it the only way the agent is allowed to signal that it's done.

```python
tools = [
    # ... your domain tools ...
    {
        "name": "task_complete",
        "description": (
            "Call this when you have fully completed the task. "
            "Do not call any other tools after this. "
            "Use status='failed' if you cannot complete the task."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["success", "failed"]},
                "summary": {"type": "string"},
                "result": {"type": "object"}
            },
            "required": ["status", "summary"]
        }
    }
]
```

Your run loop now has a clean termination condition:

```python
def run_agent(prompt):
    messages = [{"role": "user", "content": prompt}]
    for _ in range(MAX_STEPS):
        response = client.messages.create(model=MODEL, tools=tools, messages=messages)
        for block in response.content:
            if block.type == "tool_use" and block.name == "task_complete":
                return block.input  # {"status": "success", "summary": "...", "result": {...}}
        messages = advance(messages, response)
    raise RuntimeError("Agent hit step limit without completing")
```

No prose-parsing. No inference. The agent calls `task_complete` and you get a structured result back.

## Why This Matters

**You can tell success from failure.** An agent that ran out of options can call `task_complete(status="failed", summary="Could not find matching records")` instead of looping or emitting an apologetic paragraph. Your caller gets a typed signal it can act on — retry, escalate, or surface to the user.

**You eliminate ambiguous termination.** Without a done tool, you're guessing: did the agent stop because it finished, because it hit a context limit, or because the loop exited early? A `task_complete` call is unambiguous.

**Your trace shows intent.** When you log tool calls, you get a record of what the agent *claimed* to have accomplished — not just what it did. This makes debugging long runs much easier: find `task_complete`, read the summary, then trace backwards to understand how it got there.

## One Gotcha

Don't make `task_complete` the only exit path. Always keep a max-steps limit as a hard backstop. If the agent never calls it — because it looped, got confused, or was given an impossible task — you need a fallback. Raise from the step limit and log the full run for inspection.

This pairs naturally with an escape hatch tool (where the agent signals "I don't know how to proceed") — but those are the negative case. The done tool is the affirmative signal. Every agent needs both.
