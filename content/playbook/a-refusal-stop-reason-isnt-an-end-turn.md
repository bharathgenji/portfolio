---
title: "A Refusal Stop Reason Isn't an End Turn"
date: "2026-09-16"
summary: "Claude 4 models can stop mid-generation with stop_reason: \"refusal\" — fold that into your generic end_turn handling and you'll ship partial, unsafe-adjacent text as if it were a finished answer."
tags: ["agents", "reliability", "safety"]
status: draft
author: "Bharath"
---

## The branch that swallowed a distinct signal

Most agent loops check `stop_reason` for exactly one thing: is it `tool_use`, meaning there's a call to execute, or is it anything else, meaning the turn is done and the text is the answer. That binary worked fine for years because "anything else" only ever meant `end_turn` or `max_tokens`, and most loops already special-case `max_tokens` as a truncation error. Claude 4 models added a third value to that set — `stop_reason: "refusal"` — and a loop that never updated its branch now treats a mid-generation refusal exactly like a completed, safe answer.

The distinction matters because a refusal here isn't the model producing prose that says "I can't help with that." That case was always `end_turn` — normal completion, refusal text, nothing special about the stop reason. The new value fires when the model starts generating a response that looks fine at first, and partway through decides the direction it's headed is one it shouldn't finish. What you get back is a partial completion cut off at the point of that decision, not a coherent message and not a coherent refusal either — just however many tokens it got out before stopping.

## Where this breaks an agent, specifically

Feed that partial text into whatever consumes the "final answer" and you get one of two bad outcomes. If it's shown directly to a user, they see a response that trails off mid-sentence with no explanation. If it's fed forward as input to the next step of a pipeline — summarized, parsed for a tool argument, appended to a document — you've now built downstream state on top of content the model itself declined to finish producing. Neither failure looks like a crash. Both look like a strange, hard-to-reproduce quality bug, because nothing threw.

```python
if response.stop_reason == "tool_use":
    execute_tool_calls(response)
elif response.stop_reason == "refusal":
    log_refusal(response, trace_id)
    raise RefusalStop("model declined mid-generation — do not forward partial content")
elif response.stop_reason == "max_tokens":
    raise TruncatedResponseError("ceiling hit before completion")
else:
    return response.content  # end_turn: safe to use
```

Two things follow from giving it its own branch instead of falling through to `else`. First, don't naively retry — the input that produced a refusal will very likely produce the same refusal again, the same reason a retry doesn't fix a shared cause anywhere else in your stack ([[a-retry-doesnt-fix-a-shared-cause]]). Escalate or reformulate, don't loop. Second, if you're grading agent transcripts for an eval suite, a refusal stop isn't the same failure class as a wrong answer — folding it into your pass/fail rubric without distinguishing "declined" from "incorrect" corrupts exactly the signal [[grade-the-trajectory-not-just-the-final-answer]] is trying to give you.

## The rule

Every value `stop_reason` can take is a distinct outcome, not a spectrum with `tool_use` on one end and "done" on the other. Audit your loop's branch the same way you'd audit it after any provider adds a new enum value to a field you're already switching on — because that's exactly what happened here, and a default `else` clause is precisely the place it'll hide.
