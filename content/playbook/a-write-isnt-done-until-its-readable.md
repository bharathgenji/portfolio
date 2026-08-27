---
title: "A Write Isn't Done Until It's Readable"
date: "2026-08-27"
summary: "An agent that writes a memory and then searches for it in the same turn isn't buggy — it's racing an indexing pipeline nobody told it exists."
tags: ["agents", "rag", "consistency"]
status: draft
author: "Bharath"
---

## The note that vanished

A support agent took a customer's shipping preference mid-conversation, called `write_memory` to store it, then — two tool calls later, still the same run — called `search_memory` to confirm what it knew about the customer before drafting a reply. The search came back empty. The model, reasonably, concluded the write had failed and wrote it again. Then again, three turns later, when a different code path did the same confirm-by-search check. The customer ended up with three near-identical memory entries, and the team's first hypothesis was a bug in the dedup logic. There was no dedup bug. The vector store the memory tool wrote to indexes asynchronously — the write returned success in 40ms, but the embedding and index insert happened on a queue that took anywhere from one to eight seconds to land. The agent's search, running well inside that window, was reading an index that hadn't heard about the write yet.

## Writes and reads don't share a clock

This is the default shape of anything backed by a vector store, a search index, or a replicated read store: the write path and the read path are different systems with different latency, connected by a queue or a replication stream you don't control per-call. A relational database write is usually visible to the next read on the same connection. A vector store write is visible whenever the embedding job gets to it. Nothing in the tool's response tells the model this — `write_memory` returns `{"status": "ok"}` the same way whether the data is queryable now or in six seconds, so the model has no signal to distinguish "written" from "written and indexed."

## Don't make the agent re-derive what it just wrote

The fix isn't a retry loop on the search — that just burns latency waiting out a queue depth you can't predict. Don't route a same-turn confirmation through the read path at all. If the agent needs to reason about something it just wrote, hand it back directly from the write call instead of asking it to go find it again:

```python
def write_memory(fact: str, user_id: str) -> dict:
    record = memory_store.insert(user_id, fact)
    return {"status": "ok", "fact": record.fact, "written_at": record.ts}
```

The model already has the fact in its own context from the turn where it decided to write it — the search was never necessary for same-run confirmation, only for pulling in facts from *prior* runs. Reserve retrieval for what it's actually good at: reading state written before this session started, where the indexing lag has long since resolved. If you do need a genuine read-after-write guarantee — a hard confirmation that the index reflects the write — poll the record by ID, not by semantic search, since ID lookups usually skip the same async path.

## The tell

If retrieval intermittently misses something an agent wrote earlier in the *same run*, don't debug the embedding model or the query. Time the gap between the write call and the read call. If failures cluster when that gap is under a few seconds and disappear above it, you've found a queue, not a bug.
