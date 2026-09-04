---
title: "Score-Sorted Retrieval Silently Busts Your Prompt Cache"
date: "2026-09-04"
summary: "Two calls retrieve the exact same eight chunks and still miss the cache, because your vector index doesn't promise the same order twice."
tags: ["agents", "rag", "cost"]
status: draft
author: "Bharath"
---

## Same chunks, different order, full price

A team had their RAG agent's prompt structured correctly: system prompt first, retrieved context second, user message last, with a `cache_control` breakpoint right after the retrieved block — the standard shape for making a big chunk of context reusable across an agent's reasoning turns ([[cache-your-prompt-prefix]]). Cache hit rate on that block still sat around 40% when it should have been closer to 90%, on a corpus where the same handful of popular documents answered most queries.

The retrieved *set* was identical between calls more often than anyone expected. The retrieved *order* almost never was. `cache_control` hashes the literal token sequence, not the semantic content — swap chunk 3 and chunk 5, and you've generated a new prefix as far as the cache is concerned, even though every token downstream is byte-identical content in a different sequence.

## Why the order isn't stable

Approximate nearest-neighbor search isn't the deterministic sort it feels like. HNSW and IVF indexes traverse different candidate paths depending on query batching, shard placement, and concurrent index writes, and distance computations aren't strictly associative in floating point — two structurally equivalent queries can produce the same top-k *set* with scores that tie or nearly tie, and which one sorts first is an implementation detail, not a guarantee. A reranker stacked on top adds its own nondeterminism from batch-dependent floating-point ops. None of this is a bug in your vector store. It's just not the API contract anyone reads carefully, because "same query, same results" sounds like it should include order.

## Canonicalize before you cache, rank separately if you need it

Don't put the retriever's own order into the cached block. Sort by a stable key — the chunk's own ID — before formatting it into the prompt:

```python
def build_context_block(chunks: list[Chunk]) -> str:
    canonical = sorted(chunks, key=lambda c: c.chunk_id)
    return "\n\n".join(f"[{c.chunk_id}] {c.text}" for c in canonical)
```

Two calls that retrieve the same set now produce the same token sequence regardless of what order the index happened to return them in, and the cache hit rate becomes a function of your corpus's actual query overlap instead of your ANN index's mood.

If relevance order genuinely matters to the model's output — and for some tasks it does, since models weight earlier context more heavily — don't fight that by re-sorting the cacheable block. Emit the ranking as a small, separate, uncached hint after the breakpoint instead:

```
Most relevant chunk IDs, in order: [12, 47, 3, 91]
```

That list is a few dozen tokens, cheap to regenerate every call, and it gives the model the ordering signal without forcing the multi-thousand-token content block to be reformatted — and re-cached from scratch — every time two nearly-identical queries happen to break a tie differently.

## Check this before you tune the threshold

If you're chasing a disappointing cache hit rate on a RAG prefix, don't jump straight to "the corpus has too much long-tail variety." Diff the actual token sequences of two calls you expected to hit. If the chunk sets match and only the order differs, you have a formatting bug, not a retrieval coverage problem — and it's a one-line fix instead of a re-architecture.
