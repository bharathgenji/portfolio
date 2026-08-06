---
title: "Don't Stream a Turn You Might Retry"
date: "2026-08-06"
summary: "Token-by-token streaming feels free until your agent needs to retract what it just showed the user — then every retry is a visible contradiction, not a silent redo."
tags: ["agents", "ux", "reliability"]
status: draft
author: "Bharath"
---

## The commitment problem

Streaming a model's output token-by-token is an easy UX win when there's nothing behind it that can change its mind. Most agents aren't that simple. A turn can start generating an answer, discover mid-generation that it needs a tool call, get a validation failure on the result, and retry the whole turn with a different answer. If you streamed the first attempt straight to the screen, the user already read the wrong answer before you knew it was wrong. Your retry isn't a silent redo anymore — it's a visible contradiction, and it reads as the agent being confused even when the retry logic worked exactly as designed.

## Where this actually bites

- **Interrupted turns.** The model starts writing prose, then emits a tool call mid-turn. If that tool call errors and you retry the turn, the first half of the streamed text is still sitting in the transcript, now attached to an answer that never finished.
- **Generate-then-validate loops.** You stream the draft as it's generated, then run a schema or fact check against the completed output. If validation fails and you regenerate, the user watched the rejected version arrive in real time.
- **Orchestrator handoffs.** A sub-agent's raw draft gets streamed to the user before a judge or reviewer step re-runs it. The "final" answer the user sees isn't the one they watched being written.

In every case the failure isn't the retry — retries are correct and expected. The failure is streaming before you knew whether the turn would survive to be the answer.

## Stream after commitment, not during generation

Split a turn into a working phase and a committed phase. The working phase — tool calls, drafts, self-critique — never streams raw text to the user; show a static "working" indicator instead. Only the phase that passed validation and won't be retried gets streamed.

```python
def handle_turn(response):
    if response.has_tool_calls():
        show_working_indicator()
        return  # resolve tools, loop back in, still not streamed

    if not validate(response.text):
        show_working_indicator()
        return  # regenerate, still not streamed

    stream_to_user(response.text)  # first token shown only now
```

The check is cheap: does this turn contain tool calls, and does it pass validation. Everything before that gate is buffered server-side; nothing before it reaches the client.

## The cost is latency, not tokens

Buffering doesn't cost extra tokens — you were generating the same completion either way. The cost is that the user waits through the full generation before seeing anything, instead of watching text arrive live. For short structured turns that gap is invisible, so buffer by default. For long free-form output — a report, a generated file — the wait is real, so stream those live once you're past the point where tool calls or validation typically trigger a retry, and accept the small residual risk on the tail.

## Move validation earlier if you can

The real fix is closing the gap between where you buffer and where you validate. A turn that's schema-checked as it streams, or graded by a cheap classifier on completed sentences rather than the whole response, lets you commit to streaming sooner instead of holding the entire turn hostage to a check that only runs at the end.

A token rendered to a user is a promise. Don't make it before you know you can keep it.
