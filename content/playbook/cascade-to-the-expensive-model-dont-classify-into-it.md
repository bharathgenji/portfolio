---
title: "Cascade to the Expensive Model, Don't Classify Into It"
date: "2026-10-13"
summary: "Predicting a query's difficulty before you've tried to answer it is a weaker signal than the actual attempt — let the cheap model fail first."
tags: ["agents", "cost", "latency"]
status: draft
author: "Bharath"
---

## The classifier has the same problem it's trying to solve

Static routing — hardcode which step types go to which model — works when the step types really are uniformly easy or hard. It breaks on the step type that's easy 90% of the time and brutal the other 10%: "answer this support question," "extract these fields from this contract," "write this SQL." For those, you're tempted to add a classifier in front: a cheap model that reads the query and predicts whether it needs the expensive one.

That classifier is now doing a harder job than the one you're trying to avoid. It has to judge difficulty *without ever attempting the task*, from surface features alone. A contract clause that reads like boilerplate but has one buried exception looks easy to a classifier and is actually hard. You've added a call, added latency, and the thing you added is itself unreliable in exactly the cases you most needed it to be right.

## Try first, escalate on failure

A cascade skips the prediction and uses the actual attempt as the signal. Run the cheap model. Check the output with something cheap and deterministic — not the model's self-reported confidence, which doesn't track correctness any better than a coin flip. Escalate only when the check fails.

```python
def answer(query: str) -> str:
    draft = llm(CHEAP, query)
    if passes_check(draft, query):
        return draft
    return llm(MAIN, query)  # escalate — cheap model's attempt wasn't trustworthy

def passes_check(draft: str, query: str) -> bool:
    # cheap and specific, not "rate your confidence 1-10":
    # schema validates, required fields present, tool call resolves,
    # or a second cheap sample agrees with the first (self-consistency)
    return validate_against_schema(draft) and extracted_fields_present(draft)
```

The check has to be something other than asking the same model if it's sure — that's the mistake in [dont-ask-the-model-how-confident-it-is-read-the-logprobs]. Use a structural validator when the output has structure (parses, required fields, tool call resolves against real data), or run the cheap model twice and escalate on disagreement. Self-consistency catches the cases where the model is quietly guessing far more reliably than the model's own narration of its confidence.

## The cost math only works if escalation is the minority path

A cascade's worst case is strictly worse than routing-by-classification: the escalated fraction pays for *both* calls, serialized. If your escalation rate is 40%, you're paying the cheap-model tax on every single request and the full expensive-model cost on nearly half of them — likely worse than just sending everything to the expensive model. This pattern earns its keep specifically when escalation is rare (under ~15-20%) and the cheap check is cheap relative to the main model call. Measure your actual escalation rate on real traffic before committing to it; don't assume it from how the task looks on paper, which is the exact failure mode you built this to avoid.

## Where it doesn't fit

Hard real-time latency budgets don't tolerate the serialized worst case — a voice agent that can't afford a 2x round trip on 15% of turns should route structurally instead and eat the occasional overpay. Cascades are for cost-sensitive, latency-tolerant paths: batch extraction, async pipelines, anything where the median case being fast matters more than the tail being bounded.
