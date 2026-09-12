---
title: "Near-Duplicate Chunks Are Eating Your Top-K"
date: "2026-09-12"
summary: "Your retriever returns five chunks with great similarity scores and four of them say the same thing — cosine similarity has no idea what it already picked."
tags: ["agents", "rag", "retrieval"]
status: draft
author: "Bharath"
---

## Five chunks, four copies of the same paragraph

An agent answering "what's our refund policy for enterprise customers" pulls back five chunks, all scoring above 0.85 cosine similarity. Looks like a strong retrieval. Read them and four are near-identical restatements of the same paragraph — the source doc was chunked with 500 tokens and 100-token overlap, so the refund clause shows up in three consecutive windows almost verbatim, plus a fourth copy from a mirrored staging version of the same page. The one chunk that actually answers the enterprise-specific carve-out sits at rank six, and your top-k cutoff is five. The agent answers confidently from the wrong four.

This isn't a recall failure in the usual sense — [[ann-recall-loss-looks-exactly-like-absence]] covers the match that should have been retrieved and wasn't. This is worse to spot, because the match *was* retrieved. It's just buried under duplicates of something else.

## Why similarity search can't fix this on its own

Vector search scores each candidate independently against the query. It has no notion of what else is in the result set. If a document has near-duplicate passages, the query embedding is close to all of them for the same reason — nothing in a similarity score penalizes redundancy. So the retriever isn't wrong; it's doing exactly what you asked, which is "give me the five closest vectors," not "give me the five closest *distinct* pieces of information." Those are different specs, and most RAG pipelines only implement the first one.

## Diversify after you rank

Maximal Marginal Relevance (MMR) fixes this as a re-ranking pass over your candidate pool, not a replacement for similarity search:

```python
def mmr_select(query_vec, candidates, k, lambda_param=0.6):
    selected = []
    pool = candidates[:]
    while pool and len(selected) < k:
        def score(c):
            relevance = cosine(query_vec, c.vec)
            redundancy = max((cosine(c.vec, s.vec) for s in selected), default=0)
            return lambda_param * relevance - (1 - lambda_param) * redundancy
        best = max(pool, key=score)
        selected.append(best)
        pool.remove(best)
    return selected
```

Pull 20-30 candidates by similarity, then MMR down to your real top-k. `lambda_param` near 1.0 behaves like plain similarity ranking; push it toward 0.5 as duplication in your corpus gets worse. Tune it against an eval set that specifically includes queries where the answer requires two distinct facts, not eval sets built only around single-fact lookups.

## Fix ingestion too, but don't stop there

Dedup at ingestion time — hashing near-identical chunks, dropping mirrored pages — is cheaper and catches exact duplicates before they enter the index. It won't catch semantic duplicates (a v1 and v2 API doc phrasing the same behavior differently), which is where query-time diversification earns its keep. Run both; ingestion dedup shrinks the pool, MMR handles what slips through.
