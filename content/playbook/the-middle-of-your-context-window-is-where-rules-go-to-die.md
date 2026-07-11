---
title: "The Middle of Your Context Window Is Where Rules Go to Die"
date: "2026-07-11"
summary: "Your system prompt's constraints don't disappear from context, they just stop being read once forty tool results bury them in the middle."
tags: ["agents", "context", "reliability"]
status: draft
author: "Bharath"
---

## The rule that was right there the whole time

An agent ignores a constraint you know is in its system prompt — "never book a flight over $2,000 without confirmation" — and books one anyway. You check the transcript. The rule is there, verbatim, in message one. It didn't get compacted out, it didn't get truncated. The agent just stopped weighing it, because by the time it made the booking call, that rule was sitting under thirty turns of flight-search results and it had become, structurally, the middle of a very long context window.

This is not a training bug you can prompt-engineer around with "IMPORTANT" in caps. It's a measured property of how transformer attention degrades over long inputs: recall is strong at the start and end of context and drops significantly in between. Anthropic and other labs have published this directly — it's why "lost in the middle" is a named failure mode, not a folk theory. Your system prompt occupies a fixed position at the *start*. It doesn't move. But every tool result you append pushes it further from the *end*, which is where the model is about to generate from. Position is relative, and yours is losing.

## Fix the position, not the wording

Rewording the constraint doesn't help — the problem isn't clarity, it's location. Two things do help:

**Restate the constraint right before the decision that depends on it**, not just once at the top:

```python
def before_booking_call(messages, budget_limit):
    reminder = {
        "role": "system",
        "content": f"Reminder: do not book above ${budget_limit} without explicit user confirmation.",
    }
    return messages + [reminder]
```

This costs a few dozen tokens and puts the rule in the highest-recall zone — right next to where generation happens — instead of relying on the model to retrieve it from forty turns back.

**Order tool results by relevance to the next decision, not by call order.** If a run does five searches and the fifth one contains the number the agent actually needs, don't bury it under the first four. Put the decision-relevant result closest to the end of context, same as you'd put the most important slide last if you knew your audience's attention faded mid-deck.

## Don't overcorrect into recency bias

The fix isn't "put everything at the end" — that just trades one failure mode for another, where the model overweights whatever it read last and underweights genuinely important context earlier in the run. Be deliberate: constraints that gate irreversible actions get restated near the point of use; a general tone instruction that never changes doesn't need repeating every turn. Reserve reminders for constraints tied to money, deletion, or external sends — the same list you'd use for [[give-agent-actions-a-compensating-action]].

## Measure your own curve

"Lost in the middle" isn't a fixed cliff — where it kicks in varies by model and context length. Don't assume; test it. Take one of your real runs, bury a critical constraint at different depths in a synthetic version of that context, and check whether the model's next action respects it. That curve tells you exactly how many turns you get before a rule needs restating — and it's cheaper to find out in an eval than in a $2,000 flight booking.
