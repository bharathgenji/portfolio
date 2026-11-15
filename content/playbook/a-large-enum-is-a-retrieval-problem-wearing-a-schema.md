---
title: "A Large Enum Is a Retrieval Problem Wearing a Schema"
date: "2026-11-15"
summary: "Constrained decoding guarantees the model picks a valid enum value — past a few dozen options, it stops guaranteeing the model picks the right one."
tags: ["agents", "schema-design"]
status: draft
author: "Bharath"
---

## The categorizer that kept piling into three buckets

A support-ticket triage agent had a `category` enum that grew the way these things grow: someone added a value every time a new ticket type showed up, for two years, until it held around 180 options. Accuracy didn't fail loudly. It drifted — tickets about niche billing edge cases kept landing in `general_billing_issue` instead of the three or four more specific categories that actually existed for them. Nobody had touched the prompt or the descriptions. The enum had just gotten too big for the mechanism picking from it.

## Valid isn't the same claim as correct

[[additionalproperties-false-isnt-optional-on-a-tool-schema|Constrained decoding]] builds a grammar from your schema and only lets the model emit tokens that keep the output inside it. For an enum, that means the output is guaranteed to be one of your 180 strings. It says nothing about which one. When the real signal in the ticket text is thin relative to the number of superficially-plausible categories competing for it, the model's token probabilities spread thin across near-ties, and ties get broken by whatever has the strongest prior — the category it has seen most often, or the one whose name most closely echoes common phrasing in the ticket. That's not the model being careless. It's [[tool-order-is-a-hidden-prior|the same bias that favors earlier tools in a list]], except here it's hiding inside a single parameter instead of across a tool array, so nobody thinks to check it.

## Split the pick into a search, then a choice

An enum with 180 roughly-equally-likely options is a retrieval task, not a classification task, and constrained decoding is the wrong tool for retrieval — it can only rank what's already in front of it, and "in front of it" here means all 180 at once. Shrink what's in front of it instead. Pick a coarse category first, from an enum small enough that position and frequency bias don't matter (single digits to low teens), then load the narrow enum scoped to that bucket:

```python
def categorize(ticket_text: str) -> str:
    department = model_call(
        ticket_text,
        enum=DEPARTMENTS,            # ~8 options
    )
    subcategory = model_call(
        ticket_text,
        enum=CATEGORIES_BY_DEPT[department],   # ~15-20 options, not 180
    )
    return f"{department}/{subcategory}"
```

Each call is now choosing from a small enough set that the real signal in the ticket dominates the pick instead of getting diluted by it. Two calls cost more than one, but you're paying for the thing that was actually missing — discrimination — not for fewer tokens.

## Measure per-bucket, not in aggregate

Aggregate accuracy hides this failure because a model that's wrong in a consistent direction still looks fine on the categories it defaults to — `general_billing_issue`'s own precision looks great, since everything that lands there is plausibly billing-related. Break the eval down by category and look specifically at recall on the low-frequency ones. Those are the categories a 180-way enum is quietly routing around.

## Where the line is

There's no exact threshold, but once an enum passes a few dozen live, equally-plausible options, stop adding to it and start sharding it. If you're still only seeing this at the design stage: cap new enums around 20–30 values on their own, and plan the two-step split before the 31st value becomes someone else's incident.
