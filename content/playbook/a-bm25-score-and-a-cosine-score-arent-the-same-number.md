---
title: "A BM25 Score and a Cosine Score Aren't the Same Number"
date: "2026-09-21"
summary: "Average a lexical score and a semantic score without normalizing them first and your hybrid search isn't blending two signals — it's just running whichever one happens to have the bigger range."
tags: ["agents", "retrieval", "rag"]
status: draft
author: "Bharath"
---

## The hybrid search that was secretly pure vector search

A team added BM25 to a retrieval agent that had been embedding-only, expecting the usual hybrid-search win: better recall on exact terms — SKUs, error codes, proper nouns — that embeddings blur together. They fused the two rankings the obvious way, `final_score = 0.5 * bm25_score + 0.5 * cosine_score`, shipped it, and saw almost no change in retrieval quality. Queries that should have been rescued by an exact SKU match still pulled semantically-similar-but-wrong chunks. BM25 wasn't broken. It was just being outvoted on every single query, because its scores and the embedding scores don't live on the same number line.

## Why the average lies

Cosine similarity is bounded, roughly 0 to 1 for normalized embeddings, and tightly clustered — most real corpora put on-topic results somewhere in a narrow 0.6–0.85 band. BM25 is unbounded, term-frequency-driven, and long-tailed: scores can be 2 for a weak match and 40 for a document that repeats the query terms densely. Average `0.5 * 0.75 + 0.5 * 12.0` and the BM25 term doesn't get a 50% vote — it gets nearly all of it whenever a document scores high on it, and almost none of it whenever it doesn't, because its raw magnitude dwarfs the embedding term either way. You didn't build a weighted blend. You built a switch that mostly reads the score with the bigger range, and which one that is changes per query depending on term rarity — so the behavior isn't even wrong in a way you can weight your way out of. It's wrong differently on every query.

## Normalize within the candidate set, not against a global constant

Don't try to hand-pick a fixed divisor for BM25 — its scale depends on corpus statistics and query length, so a constant that works today drifts as your index grows. Normalize each ranking against its own result set, per query, before fusing:

```python
def normalize(scores: list[float]) -> list[float]:
    lo, hi = min(scores), max(scores)
    if hi - lo < 1e-9:
        return [0.5] * len(scores)
    return [(s - lo) / (hi - lo) for s in scores]

def fuse(bm25: dict[str, float], cosine: dict[str, float], w: float = 0.5) -> dict[str, float]:
    ids = bm25.keys() | cosine.keys()
    bm25_n = dict(zip(bm25, normalize(list(bm25.values()))))
    cos_n = dict(zip(cosine, normalize(list(cosine.values()))))
    return {i: w * bm25_n.get(i, 0) + (1 - w) * cos_n.get(i, 0) for i in ids}
```

This is min-max within the current top-k from each retriever, recomputed every query. It's cheap — you already have both score lists in hand — and it means `w` is now a real, stable knob: 0.5 actually means "equal weight," not "whichever retriever's units are bigger this time."

## Or skip scores entirely — fuse ranks

If you don't trust normalization to be stable across query types, Reciprocal Rank Fusion sidesteps the units problem completely by never looking at raw scores, only positions: `score = sum(1 / (k + rank_i))` across retrievers, with `k` around 60. It throws away magnitude information, which sounds like a loss, but magnitude was the thing lying to you in the first place. RRF is the safer default; hand-tuned score normalization is worth it only once you've confirmed magnitude actually carries signal your rank position doesn't.

## The tell

If adding a second retriever to your pipeline changes almost nothing about which documents come back — or changes everything, chaotically, query to query — check the fusion step before you touch either retriever. A retrieval agent citing the wrong chunk isn't always a chunking or embedding problem ([[near-duplicate-chunks-are-eating-your-top-k]]); sometimes the right chunk was found and outvoted by a unit mismatch nobody normalized away.
