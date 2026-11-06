---
title: "A Long-Context Request Prices Every Token at the Higher Tier, Not Just the Overage"
date: "2026-11-06"
summary: "Push one prompt past 200K tokens and the provider doesn't bill you for the extra tokens at a markup — it rebills the entire request, including the first 200K, at the long-context rate."
tags: ["agents", "cost", "context-window"]
status: draft
author: "Bharath"
---

## The invoice that didn't match the token count

A team running a codebase-QA agent noticed their per-call cost had roughly doubled on a subset of requests, with no change to model, prompt template, or traffic mix. The expensive requests weren't outliers by much — a 198K-token prompt cost what it always had, and a 206K-token prompt on the same question, against the same repo, cost nearly twice as much for barely 4% more input. Nobody had changed pricing. The prompt had just crossed 200,000 tokens, and that crossing is a cliff, not a slope.

## Why a few extra tokens doubles the bill

Long-context pricing on frontier models isn't marginal — it's a tier applied to the whole request. Anthropic's published rates for Claude Sonnet, for example, charge roughly $3/$15 per million input/output tokens up to 200K tokens of input, and roughly $6/$22.50 per million once the prompt exceeds that — and the higher rate applies to *every* token in the request, not just the tokens past 200K. A 206K-token prompt isn't "200K at the normal rate plus 6K at the premium rate." It's 206K tokens, all of them, at the premium rate. The marginal 6K tokens cost more than themselves — they drag the other 200K tokens that were already there into the markup with them.

```
199,000 tokens @ $3/M  -> $0.597
206,000 tokens @ $6/M  -> $1.236   # +3.5% input, +107% cost
```

That shape — a flat cost curve with a step function in the middle — is exactly the kind of thing that's invisible in small-scale testing and brutal at the tail. Your eval prompts and demo repos stay comfortably under 200K. Then a real user asks a question against a bigger codebase, retrieval pulls in a few more files than usual, and that one request costs twice what every adjacent request cost, for a reason that has nothing to do with how much harder the question was.

## Treat 200K as a wall, not a budget to approach

Instrument prompt size as its own metric, separate from cost and from the context-window ceiling you're already tracking for capacity reasons ([[a-cache-hit-still-counts-against-your-context-window]]) — this is a pricing boundary, not a capacity one, and it bites well before you'd hit any hard limit. Alert when p95 prompt size gets within striking distance of 200K, before it starts crossing.

Then design for staying under the line instead of paying the toll. If retrieval is what's pushing requests over — one more matched chunk, one more file pulled in for "just in case" context — cap what you retrieve to a token budget with headroom under 200K, not up to it. If the task genuinely needs more context than that, decide it deliberately: either eat the tier change as a known cost for a specific class of request, or split the work into two calls that each stay under the threshold, since two sub-200K calls can easily cost less than one request that trips the tier. What you want to avoid is the current state most teams start in — a token count that drifts across 200K by accident, call by call, as retrieval or history grows, with nobody having decided that trade was worth making.
