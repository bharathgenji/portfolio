---
title: "Mixed Embedding Versions in One Index Don't Error, They Just Rank Wrong"
date: "2026-08-29"
summary: "Upgrade your embedding model and re-embed only new documents, and your vector store keeps serving results — it just quietly stops meaning anything for half the corpus."
tags: ["agents", "rag", "reliability"]
status: draft
author: "Bharath"
---

## The upgrade that looked free

A team swapped their embedding model for a newer version with better benchmark numbers — same provider, same output dimension, drop-in replacement as far as the SDK was concerned. To avoid a full re-embed of eleven million chunks, they did the sensible-looking thing: embed new documents with the new model going forward, leave the old vectors in place, let the index fill in over time. Queries kept returning results. Nothing crashed. Retrieval quality on recent documents got slightly better, matching expectations.

Retrieval quality on everything else got worse, and nobody noticed for three weeks because "worse" didn't look like a failure — it looked like the usual noise in relevance scoring. When someone finally plotted precision against document age, there was a cliff exactly at the cutover date.

## Why the API doesn't stop you

Cosine similarity is just a dot product on normalized vectors. It doesn't check where a vector came from — it'll happily compute a score between a vector from model A and a vector from model B as long as the dimensions match, which they usually do, since providers keep output dimension stable across model versions specifically so upgrades feel like drop-in replacements. The operation succeeds. The number it returns is meaningless, because "close" in model A's embedding space and "close" in model B's embedding space aren't the same geometric claim. A query embedded with the new model will score against old-model vectors at distances that don't correspond to relevance in either direction — sometimes too high, sometimes too low, with no consistent bias you can post-correct for.

This is the same failure shape as [[semantic-caching-saves-money-until-it-returns-the-wrong-answer]]: a similarity score that looks calibrated but is answering a different question than the one you think you're asking.

## Treat the embedding model like a foreign key

Stamp every vector with the model version that produced it, and make your index refuse to compare across versions:

```python
def upsert_chunk(chunk_id: str, text: str, model_version: str):
    vector = embed(text, model=model_version)
    store.upsert(chunk_id, vector, metadata={"embed_model": model_version})

def query(text: str, model_version: str):
    vector = embed(text, model=model_version)
    return store.search(vector, filter={"embed_model": model_version})
```

Partition by version — separate namespaces, separate collections, whatever your store calls it — rather than one pool with a metadata tag you have to remember to filter on. A filter you can forget is a bug waiting for the next person who writes a query path.

## The migration is not optional

Once you partition, you have exactly two honest options: run a full backfill of the old corpus under the new model before cutting traffic over, or keep both partitions live and merge-rank results from each until the backfill finishes. What you can't do is call it done at "new documents use the new model." That's not a migration, it's a slow-motion bifurcation of your index into two spaces that don't compare, sitting in the same collection, both looking equally valid.

## The tell

If retrieval quality degrades gradually after a "quick" embedding model bump and nobody touched chunking, ranking, or the corpus itself, check document age against the cutover date before you debug anything else. A cliff at that date means you have two vector spaces, not one degraded index — and the fix is a backfill, not a tuning pass.
