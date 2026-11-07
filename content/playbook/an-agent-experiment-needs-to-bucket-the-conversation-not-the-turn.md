---
title: "An Agent Experiment Needs to Bucket the Conversation, Not the Turn"
date: "2026-11-07"
summary: "Re-roll the A/B variant on every request instead of once per conversation, and a single user can get both arms of your experiment in one session — and neither arm's metrics mean anything afterward."
tags: ["agents", "experimentation", "reliability"]
status: draft
author: "Bharath"
---

## The discount that didn't exist two turns later

A support agent was mid-rollout on a new system prompt: variant B added a `offer_discount` tool and softer refund language, variant A didn't. The experiment framework bucketed by request, not by conversation — each incoming message rolled an independent coin and routed to whichever prompt won. Turn one of a session landed on B and the agent offered the customer 15% off to stay. Turn three of the *same* session landed on A, which has no `offer_discount` tool, and when the customer said "okay, apply that discount" the agent had nothing to call and no memory of having promised anything, because the promise lived in a system prompt variant it was no longer running under. The customer saw an agent contradict itself inside one chat window. Support saw a ticket. Nobody saw a bug, because nothing threw — the agent just quietly stopped being the agent that made the offer.

## Why per-request bucketing breaks the measurement too

This isn't only a user-experience bug — it corrupts the experiment itself. The whole point of an A/B split is that each unit of analysis experienced exactly one treatment. A conversation that got both variants isn't cleanly attributable to either arm, but most pipelines record it as one data point per arm anyway, once for each turn. Inflate that across thousands of sessions and you get a lift number that reflects how often your coin flipped mid-conversation at least as much as it reflects whether variant B is actually better. You'll ship or kill a prompt change based on noise you manufactured yourself.

## Bucket on a stable key, once

The assignment has to be a deterministic function of the conversation, computed once and reused for the life of the session — not re-rolled per request:

```python
def variant_for(conversation_id: str, experiment: str, rollout_pct: int) -> str:
    h = int(hashlib.sha256(f"{experiment}:{conversation_id}".encode()).hexdigest(), 16)
    return "B" if (h % 100) < rollout_pct else "A"
```

Compute this on the first turn and persist it against the conversation record — the same way you'd persist a session ID for a stateful tool ([[stateful-tools-need-sticky-sessions]]). Every subsequent turn looks up the stored assignment instead of recomputing it, so a rollout percentage change tomorrow can't flip someone mid-conversation today.

## The boundary you still need to pick

"Per conversation" is the right grain for a support chat, but pick the actual boundary deliberately: a multi-day account relationship might need "per customer" so the same person doesn't see the prompt change every time they open a new ticket, and an agent that runs scheduled batch jobs might need "per job run." The rule is the same at every grain — identify the unit whose experience needs to stay coherent, hash that unit's ID once, and never let a retry, a redeploy, or a rollout-percentage bump re-derive a different answer for an ID you've already committed to.

## Check this before you trust any agent experiment's results

Before reading a lift number, query for sessions that touched more than one variant. If that count isn't zero, the experiment's bucketing is the bug you need to fix, not the prompt.
