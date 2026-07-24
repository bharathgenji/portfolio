---
title: "Your Retrieval Index Doesn't Know What Time It Is"
date: "2026-07-17"
summary: "Cosine similarity has no idea a document is three weeks stale — so your agent will cite last month's policy with this month's confidence."
tags: ["agents", "rag", "reliability"]
status: published
author: "Bharath"
---

## The confidently wrong answer

A support agent gets asked "what's the current refund window?" It retrieves the top-scoring chunk from the vector store, which is a section of the refund policy doc — 0.89 cosine similarity, clearly the right document. It answers "30 days" with full confidence. The policy changed to 14 days two days ago. The new doc is sitting in the source system; the nightly re-embedding job hasn't run yet because the ingestion queue backed up over the weekend. Nothing in the retrieval pipeline threw an error. Nothing looked wrong. The chunk was topically perfect and factually dead.

This is the gap most RAG systems miss: relevance and freshness are different signals, and embedding similarity only measures one of them. A doc from six months ago about your refund policy and a doc from yesterday about your refund policy score almost identically on "is this about refunds" — because that's the only question cosine similarity is answering. Nothing in the retrieval path asks "is this still true."

## Put the timestamp in the text, not just the metadata

Most pipelines already store `source_updated_at` as metadata. It just never reaches the model — it sits in a database column the retrieval tool doesn't surface. Fix that first, before anything fancier:

```python
def format_chunk(chunk: Chunk, now: datetime) -> str:
    age_days = (now - chunk.source_updated_at).days
    staleness = f"[source updated {age_days}d ago]"
    return f"{staleness}\n{chunk.text}"
```

Now the model can reason about age the same way it reasons about content. Put a line in the system prompt to make it act on that signal: "If the top result for a policy, pricing, or inventory question is more than N days old, say so explicitly or prefer a fresher source if one exists." This costs nothing beyond string formatting and turns an invisible risk into something the model can at least flag.

## Tag volatility per source, not per query

Not every document ages the same way. An onboarding guide from a year ago is probably still fine; a pricing page from a week ago might not be. Rather than guessing per-query, tag volatility at ingestion time — `stable`, `seasonal`, `volatile` — based on how often the source document has historically changed. Route `volatile`-tagged queries to a live lookup (a database call, an API) instead of the vector store entirely. A vector index is a cache of the world as of the last embedding run; for anything that changes daily, a cache is the wrong tool no matter how good the retrieval is.

## Re-embed by change frequency, not on a fixed schedule

A single nightly batch job treats a policy doc that changes weekly the same as a product manual that hasn't changed in a year. Prioritize your re-embedding queue by source volatility: high-churn documents get re-indexed on webhook (source saved → re-embed within minutes), low-churn documents stay on the nightly batch. This is a small scheduling change that fixes the actual failure mode — the lag between "document changed" and "index reflects it" — instead of just making the lag more visible.

Surfacing staleness doesn't make your index current. It makes the gap between current and indexed something your agent can see and act on, instead of a silent assumption baked into every retrieval call.
