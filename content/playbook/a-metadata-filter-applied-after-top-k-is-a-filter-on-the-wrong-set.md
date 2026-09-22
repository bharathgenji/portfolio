---
title: "A Metadata Filter Applied After Top-K Is a Filter on the Wrong Set"
date: "2026-09-22"
summary: "Ask a vector index for 10 results, filter to one customer's documents afterward, and you can get zero back even though that customer has hundreds of matching chunks."
tags: ["agents", "rag", "retrieval"]
status: draft
author: "Bharath"
---

## The support agent that couldn't see its own customer's docs

A support agent retrieved context with `vector_index.search(query_embedding, top_k=10)`, then filtered the results in application code to `customer_id == current_customer`. It worked in every demo, because the demo tenant's documents dominated the small test index. In production, against a shared index with thousands of tenants, the agent started answering "I don't have any information about that" for customers who had extensive documentation sitting in the index. The retrieval wasn't broken. It was retrieving the right *global* top 10 and then throwing away every one of them because none happened to belong to the customer asking.

This is post-filtering, and it's the default behavior of `top_k` plus an application-side filter, which is exactly the code path most people write first because it's the obvious way to bolt access control onto a retrieval call that didn't have it.

## Why top-k and filtering don't commute

`search(top_k=10)` returns the 10 globally nearest vectors, full stop — the index has no idea yet that you're about to discard the ones that don't match a metadata field. If your corpus has 10,000 tenants and one query's true nearest neighbors happen to cluster around three other tenants' documents, your 10 results can legitimately contain zero hits for the tenant you actually care about. Filtering afterward doesn't recover the ones the index never returned; the information about how the filtered document ranked against the query is simply gone. You didn't search "this customer's documents for the nearest match." You searched everyone's documents and then asked whether any of the ten winners happened to belong to your customer.

The failure is silent for the same reason ANN recall loss is silent — an empty result set looks identical whether nothing matched or something matched but never made it into the candidate window.

## Filter before the ANN search selects candidates, not after

The fix is pre-filtering: pass the metadata constraint into the index call so it restricts the candidate set the ANN graph traversal operates over, before `top_k` truncates anything.

```python
def search_scoped(query_embedding, customer_id, top_k=10):
    return vector_index.search(
        query_embedding,
        top_k=top_k,
        filter={"customer_id": customer_id},   # applied during traversal, not after
    )
```

Most managed vector databases (Pinecone, Weaviate, Qdrant, pgvector with a WHERE clause feeding the planner) support this natively — check whether yours implements it as true pre-filtering or as post-filtering with a bigger internal `top_k` under the hood, because some do the latter and call it a filter anyway. The tell is in the docs: if there's a warning about filter selectivity affecting recall, that's pre-filtering done honestly. If there's no mention of it at all, test it — insert 1000 documents for tenant A, one for tenant B, and confirm a tenant-B-filtered query for a tenant-B document still returns it.

## Partition when filtering is really access control

If the metadata field is a hard security boundary rather than a ranking preference — tenant isolation, not "prefer recent docs" — don't lean on filter selectivity at all. Give each tenant its own namespace or index partition. Most vector databases support this as a first-class primitive, and it turns "hope the filter has enough recall headroom" into "the other tenant's vectors are structurally absent from this search," which is a much easier property to reason about when a customer asks why your support bot answered from someone else's contract.
