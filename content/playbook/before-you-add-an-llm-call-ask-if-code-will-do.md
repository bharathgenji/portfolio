---
title: "Before you add an LLM call, ask if code will do"
date: "2026-06-21"
summary: "The fastest, cheapest, most reliable LLM call is the one you never make — and most agent pipelines are full of candidates."
tags: ["agents", "cost", "patterns"]
status: draft
author: "Bharath"
---

When you're building an agent, every decision point feels like a place to add a model call. "Should I classify this as urgent or routine?" → LLM call. "Does this message contain a complaint?" → LLM call. "Is this a valid ISO date?" → LLM call.

Some of these are genuinely LLM-sized problems. Most aren't.

## The reflex is expensive

An agent I audited recently made 11 model calls per run. Seven of them were tasks I could replace with roughly 30 lines of Python: keyword matching, format validation, field extraction from structured JSON. The remaining four needed real reasoning. That's a 7x reduction in LLM calls — and the code paths are faster, cheaper, and deterministic.

The problem isn't laziness. It's that LLMs work on everything, so reaching for one becomes the path of least resistance. The mindset shift: LLM calls are expensive specialists. Every call you can replace with code should be replaced.

## What's secretly just code

**Classification with a fixed label set:**

```python
# Don't do this for well-defined categories:
label = llm(f"Classify as 'billing', 'technical', or 'other': {message}")

# Do this:
BILLING = {"invoice", "charge", "payment", "refund", "subscription"}
TECHNICAL = {"error", "crash", "bug", "broken", "not working"}
words = set(message.lower().split())
label = ("billing" if words & BILLING
         else "technical" if words & TECHNICAL
         else "other")
```

Keyword matching handles 80%+ of your traffic for narrow domains. Reserve the model for the ambiguous tail — route to it only when the rule-based path returns `"other"`.

**Format validation:** Whether a string is a UUID, a valid email, or a parseable date is a regex or library call. It's also deterministic in a way a model call is not — LLMs will occasionally accept "definitely_not_a_uuid" if your prompt drifts slightly.

**Extraction from machine-readable input:** If the source is already JSON, XML, or CSV, parse it. Using a model to extract the `user_id` from a JSON blob you could `json.loads()` is paying reasoning costs for zero reasoning.

**Arithmetic, sorting, deduplication:** These are functions. The model will get them right *most* of the time, which is not the same as always.

## The three-question test

Before writing an LLM call for any agent step:

1. Is the output from a finite, enumerable set? → Lookup table or match statement.
2. Is the input already machine-readable? → Parser, not model.
3. Can I fully express the logic in a function without judgment calls? → Write the function.

If you answer no to all three, the model earns its place.

## The reliability argument matters more than cost

The cost savings are real — routing 70% of calls to code instead of Haiku-tier models can cut per-run spend by 40–60% at volume. But the reliability argument is more important.

Code doesn't drift. An LLM classifier returning "billing" or "technical" behaves differently across model versions, temperature settings, and rephrased prompts. A keyword match returns the same result forever. For the deterministic cases, that consistency is worth more than the flexibility you're giving up.

The pattern to internalize: use LLMs for judgment under ambiguity — synthesizing evidence, navigating nuance, generating novel content. Use code for everything that has a right answer.