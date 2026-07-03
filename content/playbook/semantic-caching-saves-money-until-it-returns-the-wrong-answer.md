---
title: "Semantic Caching Saves Money Until It Returns the Wrong Answer"
date: "2026-07-03"
summary: "Embedding-similarity caches cut LLM spend on repeat questions, but they'll confidently serve the wrong cached answer unless you gate every hit."
tags: ["agents", "cost", "reliability"]
status: draft
author: "Bharath"
---

A support agent gets asked "can I get a refund after 30 days?" a thousand times a day, in a thousand different phrasings. Exact-match caching catches none of it — every rephrasing is a cache miss and a full model call. So teams add a semantic cache: embed the incoming query, look up the nearest neighbor in a vector store, and if the cosine similarity clears some threshold, serve the cached answer instead of calling the model.

It works, and the savings are real — a well-populated cache can absorb 40-60% of traffic for a high-volume FAQ-style agent. It also has a failure mode that exact-match caching doesn't: it will serve you a wrong answer with full confidence, because "similar" is not "same."

## The near-duplicate trap

"Can I cancel within 30 days of purchase?" and "Can I cancel within 3 days of purchase?" embed extremely close together — the surrounding sentence structure dominates the embedding, and a single digit barely moves it. Same for "Does the Pro plan include SSO?" versus "Does the Team plan include SSO?" Swap one entity, keep the sentence shape, and you're well inside most similarity thresholds (0.90+ cosine on typical embedding models).

The cache doesn't know it got the entity wrong. It returns the top-1 match with high confidence, and the agent repeats a wrong refund window or the wrong plan's feature list to a customer. This is worse than a miss — a miss costs you a model call, a bad hit costs you a wrong answer nobody notices because nothing errored.

## Gate the hit, don't trust the score

Similarity score alone is not a sufficient gate. Before serving a cache hit, extract the load-bearing entities from both the incoming query and the cached query — numbers, plan names, dates, product SKUs — and require them to match exactly:

```python
def resolve(query, top_match, threshold=0.90):
    if top_match.score < threshold:
        return None  # miss, call the model

    incoming_entities = extract_entities(query)       # cheap, regex/NER
    cached_entities = top_match.metadata["entities"]

    if incoming_entities != cached_entities:
        return None  # similarity lied, treat as a miss

    return top_match.metadata["answer"]
```

`extract_entities` doesn't need to be smart — a regex for numbers, dates, and a fixed vocabulary of plan/product names covers most support and internal-tool traffic. The point isn't perfect extraction; it's refusing to serve a cached answer when something numeric or named differs, since that's exactly what similarity scores are blind to.

## Where this pays off

This is worth building once your agent handles enough repeat traffic that the cache hit rate matters — a few hundred queries a day on a narrow domain, not a general-purpose assistant with unbounded query variety. Below that volume, the engineering cost of entity extraction and cache population isn't worth it; just eat the model calls.

Log every gated rejection (high similarity, entity mismatch) separately from clean hits and misses. That log is your best signal for tightening the threshold or expanding the entity list — and it's the first place to look when someone reports the agent gave a suspiciously specific wrong answer.
