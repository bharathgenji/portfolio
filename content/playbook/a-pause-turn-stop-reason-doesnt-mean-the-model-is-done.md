---
title: "A Pause Turn Stop Reason Doesn't Mean the Model Is Done"
date: "2026-10-25"
summary: "An agent loop that only branches on tool_use treats pause_turn as a finished answer, and a multi-search research run comes back a third of the way through its work."
tags: ["agents", "tool-calling", "reliability"]
status: draft
author: "Bharath"
---

## The research run that stopped at 70%

An agent was told to use the web search tool to compile sources for a competitive analysis — a task that needs eight or ten searches chained together, each one informed by the last. The run came back with three sources and a summary that read like it was cut off mid-thought, because it was. Nothing errored. The loop's branch was `if stop_reason == "tool_use": execute_and_continue() else: return response.content`, and on a long server-side-tool turn the API didn't come back with `tool_use` or `end_turn` — it came back with `stop_reason: "pause_turn"`, which fell straight into the `else` and got returned to the user as if the model were finished.

It wasn't finished. It was paused.

## Why a turn pauses instead of ending

Server-side tools — web search, code execution, computer use — run on the provider's infrastructure, not yours, and a turn that chains several of them can run long enough that the API breaks it into resumable segments instead of holding one request open indefinitely. `pause_turn` is the signal for that: the model hadn't decided it was done, hadn't produced a final answer, and wasn't waiting on you to execute a client-side tool either. It's a third state, distinct from both `end_turn` and `tool_use`, and a loop written before your SDK added server tools has no branch for it — because `pause_turn` didn't exist when that loop's `else` clause was written to mean "safe to use."

This is the same category of bug as [[a-refusal-stop-reason-isnt-an-end-turn]]: a provider adds a new value to an enum you're already switching on, and the catch-all branch silently absorbs it as if it meant what it used to mean.

## The fix: echo the paused response back, don't start a new turn

The correct response to `pause_turn` isn't to parse it as output or retry the request — it's to continue the same turn by sending the paused response straight back as the next assistant message, with no new user content:

```python
def run_turn(messages, tools):
    response = client.messages.create(model=MODEL, tools=tools, messages=messages)

    if response.stop_reason == "tool_use":
        messages.append(assistant_turn(response))
        messages.append(tool_results_turn(execute(response)))
        return run_turn(messages, tools)

    if response.stop_reason == "pause_turn":
        messages.append(assistant_turn(response))
        return run_turn(messages, tools)  # same turn, no new user message

    return response  # end_turn, max_tokens, refusal — turn is actually over
```

Treat the paused content as opaque and replay it verbatim, the same discipline you'd apply to a thinking block ([[thinking-blocks-travel-with-their-tool-call]]) — reconstructing it by hand instead of passing through what the API gave you is how you end up with a turn that resumes from a state the model never actually produced.

## The rule

A long agent loop built around `tool_use` vs. everything-else was a fine model of the API the day it was written. Server-side tools added a stop reason that is neither "call this" nor "done" — it's "keep going, same turn." Audit the `else` branch in every place you switch on `stop_reason`; a new enum value from the provider will always land there first, and it will look like success right up until someone notices the answer is missing two-thirds of its sources.
