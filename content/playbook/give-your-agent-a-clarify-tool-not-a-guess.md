---
title: "Give Your Agent a Clarify Tool, Not a Guess"
date: "2026-08-09"
summary: "An agent that silently picks the wrong interpretation of an ambiguous request is more dangerous than one that asks — but only if you make asking cheap and rare enough to actually work."
tags: ["agents", "tool-design", "reliability"]
status: published
author: "Bharath"
---

## "Cancel the subscription" — which one?

A user with three active subscriptions tells your agent to "cancel the subscription." The agent has tools to look up all three, pick the most recently used one, and cancel it. It does exactly that. It's wrong two times out of three, and nothing in the trace looks like a failure — the tool call succeeded, the API returned 200, the summary says "Done, your subscription has been canceled."

This is a different failure mode from the one an escape hatch fixes ([[give-your-agent-an-escape-hatch]]). Escape hatches handle *insufficient information to answer at all* — the retrieved context doesn't cover the question. This is *sufficient information to act, ambiguous about which action*. The agent isn't stuck; it's confident and wrong, which is worse, because confident-and-wrong doesn't get flagged for review.

## Ambiguity resolved silently is a guess wearing a tool call

The instinctive fix is a better prompt: "if the request is ambiguous, ask for clarification." This works about as well as any other prose instruction competing against a model's drive to produce a complete-looking answer — which is to say, inconsistently, and worse under time pressure or a long context where the instruction has scrolled out of recent attention.

The reliable fix is the same one that works for abstention: make asking a structurally cheap, explicit action instead of a norm the model has to remember to follow.

```python
{
  "name": "clarify",
  "description": (
      "Call this when the request has more than one plausible interpretation "
      "AND those interpretations would lead to materially different actions. "
      "Do not call this for cosmetic ambiguity you can resolve with a reasonable "
      "default — state your assumption in the final response instead."
  ),
  "parameters": {
    "question": {"type": "string"},
    "options": {"type": "array", "items": {"type": "string"}}
  }
}
```

Calling `clarify` halts the run and returns the question to the caller instead of continuing. That's the whole mechanism. The design work is in the description, because the description is what decides whether this tool gets used well or gets used constantly.

## The real risk is the other direction

Teams that add a clarify tool usually get bitten by over-use before under-use. An agent that asks before every action isn't safer, it's a chat bot that requires babysitting — and if it's running inside an automation with no human watching the channel, a `clarify` call is a silent hang, not a safety win.

Two things keep this in check:

**Bound it to actions with real blast radius.** A clarify call is worth a round trip when the interpretations diverge on something irreversible or costly — which subscription, which environment, which recipient list. It is never worth a round trip for "should the summary be three sentences or four." Say this explicitly in the tool description; don't leave the threshold to inference.

**Give it a budget, not just a gate.** Cap clarify calls per run — one, maybe two. If the agent wants a third, that's a signal the request itself is underspecified beyond what one round of Q&A fixes, and it should hand off to a human with what it's learned so far rather than keep interviewing the user.

## Batch the question, don't dribble it

If ambiguity shows up in three places in a single plan, resolve it in one `clarify` call with three questions, not three separate round trips. Each round trip costs a full turn of latency and, in a chat UI, a context switch for the user. An agent that asks once with a numbered list reads as competent. One that asks three times in a row reads as broken.

## The rule

A wrong guess that looks like success is more expensive to catch than a question, because nobody goes looking for a bug in a call that returned 200. Make clarification a first-class, budgeted, high-threshold tool call — not a prompt instruction competing with the model's urge to just finish the task.
