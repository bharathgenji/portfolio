---
title: "ANN Recall Loss Looks Exactly Like Absence"
date: "2026-09-01"
summary: "An approximate index that misses the one match that mattered doesn't error — it returns an empty result set that your agent reads as proof nothing exists."
tags: ["agents", "rag", "reliability"]
status: draft
author: "Bharath"
---

## The duplicate ticket that got filed twice

An agent was told to check for existing bug reports before filing a new one: embed the incoming report, search the vector index for anything above a similarity threshold, file a new ticket only if nothing close came back. It worked for months, then filed an exact duplicate of a report from two days earlier — same stack trace, same error string, practically the same words. The original was sitting in the index. The search came back empty anyway.

Nothing was down. The embedding model hadn't drifted. The bug was in an assumption nobody had written down: that "the index returned nothing" and "nothing matches" are the same statement. They aren't, and the gap between them is the whole point of approximate nearest neighbor search.

## Approximate means what it says

HNSW, IVF, and every other ANN algorithm your vector database uses exist because exact nearest-neighbor search doesn't scale — they trade a small, known probability of missing the true nearest neighbor for orders-of-magnitude speedup. A recall@10 of 95%, which most teams would call excellent, means 1 query in 20 fails to surface a result that genuinely belongs in the top 10. That's not a defect to file a ticket about; it's the algorithm doing exactly what it's specified to do. HNSW skips graph edges it estimates won't lead anywhere good, and occasionally the edge it skips was the one to the real match.

For ranking and "show me similar things" use cases, that 5% is invisible noise — a slightly worse ordering nobody notices. For an existence claim — "does a duplicate exist," "has this contract clause appeared before," "is this customer already flagged" — that same 5% is the difference between a true statement and a confident false one, because the agent isn't ranking, it's asserting.

## Don't let absence-of-match become a claim of non-existence

The fix isn't a bigger index or a fancier embedding model — recall loss is structural, not a tuning bug. Treat any existence-type question separately from ranking questions:

```python
def check_duplicate(report: str) -> DuplicateCheck:
    hits = vector_index.search(embed(report), ef_search=256, top_k=5)
    exact = keyword_index.search(extract_error_signature(report))
    if not hits and not exact:
        return DuplicateCheck(is_duplicate=False, confidence="approximate")
    return DuplicateCheck(is_duplicate=True, match=hits[0] if hits else exact[0])
```

Two things are happening here. First, `ef_search` (or `nprobe` for IVF) gets bumped up for this specific call path — recall is tunable per query, and existence checks are rare enough relative to your total query volume that you can afford to pay for it. Second, a keyword or exact-match fallback runs alongside the vector search, because BM25 doesn't miss a literal stack-trace substring the way an approximate graph traversal can.

Neither change gets you to 100% recall. What it gets you is a system that's honest about the difference: a query that checked both paths at high recall and still found nothing is a much stronger claim than a single approximate lookup, and your agent's output — and the confidence it states that output with — should reflect which one it actually ran.
