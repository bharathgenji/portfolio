---
title: "Few-Shot Example Order Is a Label Bias, Not a Style Choice"
date: "2026-10-09"
summary: "A ticket-triage prompt started overcalling 'billing' the week someone appended a new example — not because the example was wrong, but because of where it landed in the list."
tags: ["agents", "prompt-engineering", "reliability"]
status: draft
author: "Bharath"
---

## The category that started winning

A support-triage agent classifies incoming tickets into `billing`, `technical`, `account`, or `other`, using four few-shot examples in the system prompt — one per category. It ran steady for months. Then someone added a fifth example for a new edge case (disputed refunds, filed under `billing`) and appended it to the end of the list. Within a day, tickets that were obviously `technical` started coming back `billing` at a noticeably higher rate. Nobody touched the instructions, the tool, or the model. They added one correct, well-labeled example and appended it last.

## This is a documented property of in-context learning, not a fluke

Few-shot classification has two biases that show up independent of how good your examples are: a **majority-label bias**, where the model leans toward whichever label appears most often in the example set, and a **recency bias**, where it leans toward whichever label appeared *last*. Appending the fifth `billing` example did two things at once — it made `billing` the majority label (2 of 5) and put a `billing` label in the final position, the slot with the most influence on the next prediction. Either bias alone would nudge the output distribution. Stacked, they're enough to move a production metric.

This is the few-shot-specific sibling of [[tool-order-is-a-hidden-prior]] — same root cause, position encodes a prior the model wasn't told it has, just applied to example labels instead of tool names.

## Test it like you'd test any other prior

Don't eyeball the prompt for balance. Permute the order and the label counts, holding the examples' content fixed, and watch whether the predicted label moves on inputs that shouldn't be ambiguous:

```python
def label_bias_check(ambiguous_input: str, examples: list[dict], n=20) -> dict:
    from itertools import permutations
    import random

    counts = {}
    for perm in random.sample(list(permutations(examples)), min(n, 24)):
        result = classify(ambiguous_input, few_shot=list(perm))
        counts[result] = counts.get(result, 0) + 1
    return counts
```

If `counts` isn't close to uniform on an input you've hand-verified is genuinely ambiguous, order is doing part of the classification for you — on inputs that aren't ambiguous at all, it's doing even more, just invisibly, because the "right" answer happens to agree with the bias often enough that nobody notices until the distribution shifts.

## Fix the set, don't randomize the call

Keep label counts equal across your few-shot set — one example per category, or a count you've deliberately chosen, never an artifact of whoever edited the prompt last. Then fix the order on purpose and leave it fixed; shuffling per request defeats prompt caching the same way randomizing tool order does, and you'd be trading a measurable bias for an unmeasured latency regression ([[your-tool-list-is-part-of-the-cache-prefix]]).

## The tell

If your classification accuracy moves when someone only *adds* a new few-shot example — not when they edit instructions, not when they swap the model — check the label distribution and position of your examples before you touch anything else. The example was probably fine. Where it sat in the list wasn't.
