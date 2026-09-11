---
title: "Deleting a Document Doesn't Delete It From Your Vector Index"
date: "2026-09-11"
summary: "You call delete() on the row, the UI confirms it's gone, and a RAG agent quotes the deleted document verbatim three weeks later — because your vector store never got the memo."
tags: ["agents", "rag", "security"]
status: draft
author: "Bharath"
---

## The document that came back from the dead

Legal asks you to remove a contract draft from the knowledge base — it contains pricing language that was never supposed to leave the negotiating team. You delete the row from Postgres, the admin UI shows it gone, ticket closed. A month later, a sales-enablement agent answering "what's our standard discount structure" quotes that exact pricing language, sourced from a chunk ID that no longer exists in your primary database. Nobody re-uploaded the document. The embedding just never left the vector index.

This isn't a caching bug in the usual sense — the primary store is correct, the UI is correct, only the retrieval path is wrong, and it's wrong in the one place nobody looks because nothing about it ever throws an error.

## Delete is a distributed operation you're treating as a local one

Your ORM's `delete()` removes a row from one system. A RAG pipeline has at least two systems that both need to agree a document is gone: the source-of-truth store and the vector index. Most delete code only touches the first, because that's the one with a foreign-key constraint reminding you it exists. The vector index has no such constraint — it's a separate service, populated by an ingestion job that ran once, and nothing forces its contents to track deletions in the store it was built from.

Even when you do call the vector database's delete API, "deleted" is often a soft guarantee. HNSW-based indexes don't cheaply remove a node from the graph — many implementations mark it as tombstoned and filter it out at query time, while the vector and its graph edges stay physically present until the next full rebuild. A cached read replica, an exported index snapshot, or a search shard that hasn't picked up the delete yet will keep serving the "removed" chunk in the meantime. Deletion in a vector store is eventually consistent even when everything is configured correctly — and silently wrong when the delete call was never wired in at all.

## Make delete one function, and audit that it stayed deleted

```python
def delete_document(doc_id: str) -> None:
    primary_store.delete(doc_id)
    vector_index.delete(where={"doc_id": doc_id})
    search_cache.invalidate(doc_id)
```

Treat this as the only delete path in the codebase — no route or admin action that removes a document without going through it. Then add the check that actually catches drift: a scheduled job that samples recently deleted `doc_id`s and runs a retrieval query against content unique to them, asserting zero hits. This is the same move [[ann-recall-loss-looks-exactly-like-absence]] makes for missing matches — an existence claim ("this is really gone") needs its own check, because a clean-looking pipeline and a correct one look identical until you query for the thing that should no longer be there.

## Where this gets worse than stale

[[your-retrieval-index-doesnt-know-what-time-it-is]] covers content that's merely outdated — wrong, but not supposed to have vanished. A deletion that didn't propagate is a different class of failure: revoked access, retracted legal content, a right-to-be-forgotten request, an employee offboarding that was supposed to pull their private notes out of a shared assistant's memory. Each of those is a promise that something no longer exists, made to a person who has no way to check it. Audit deletes as a correctness property, not an assumption the happy path gives you for free.
