---
title: "Don't Let the Model Carry the Pagination Cursor"
date: "2026-08-13"
summary: "An opaque cursor token round-tripped through the model's own output is a string the model is statistically willing to paraphrase — and a paraphrased cursor fails silently, not loudly."
tags: ["agents", "tool-design", "reliability"]
status: published
author: "Bharath"
---

## The bug that only shows up on page three

A search tool returns results plus a `next_cursor`: a base64 blob encoding offset, sort key, and a shard hint. The tool's contract is simple — pass the cursor back verbatim to get the next page. It works in every test you write, because your tests call the tool directly. It breaks in production, intermittently, only on runs where the model calls the tool three or four times in a row for the same query.

What's happening: the cursor sits in the tool result, then gets copied into the model's next turn as a plain string argument. Nothing forces an LLM to reproduce an opaque 80-character token character-for-character. It's not code copying a variable — it's a model generating tokens that are *usually* identical to the source, especially after the tool result has scrolled a few turns back in context, or through a compaction pass that summarized "then the tool returned a cursor and results 11–20." A single flipped character in a base64 token doesn't throw a parse error most of the time; it decodes to a different, still-valid-looking offset. The tool returns page seven instead of page two, silently, and the model reports back as if pagination worked.

This is the same family of problem as [[cap-your-tool-results]] and [[wrap-external-content-before-your-agent-reasons-over-it]] — content is passing through the model's generation process when it shouldn't have to — but the failure mode here is worse than truncation, because a garbled cursor doesn't look garbled. It looks like a valid request for a different page.

## Keep the cursor server-side, hand the model a handle

The fix is to stop asking the model to be a faithful copyist for data it never needed to see. Store the actual cursor in a session-scoped cache, keyed by a short id the model *can* reproduce reliably:

```python
def search(query: str, cursor_token: str | None, session: SessionCache) -> dict:
    real_cursor = session.resolve_cursor(cursor_token) if cursor_token else None
    results, next_cursor = backend_search(query, real_cursor)

    handle = session.store_cursor(next_cursor)  # short opaque id, e.g. "pg_4f2a"
    return {
        "results": results,
        "next_page_token": handle if next_cursor else None,
    }
```

`session.store_cursor` just puts the real, ugly cursor in a dict (or Redis, if sessions span processes) and returns a short id — four or five characters is plenty. The model only ever handles `pg_4f2a`. Short tokens survive context compaction and paraphrase-prone generation the same way any short identifier does, for the same reason you'd rather grep a four-character trace ID than an 80-character one.

## This generalizes past pagination

Any tool result containing an opaque token the model must round-trip verbatim — a continuation cursor, an idempotency key you want the model to reuse, a resumable-upload URL, a database transaction handle — has this exposure. The rule is the same in every case: if a value's only job is to be echoed back unchanged, don't route it through the part of your system that generates text probabilistically. Store it, hand back a short reference, and let your tool layer do the substitution the model was never a reliable choice for in the first place.

## How to catch it before prod does

Add an eval case that pages through five-plus results and asserts, at the tool boundary, that the resolved cursor on call *n* exactly matches what call *n-1* returned — not what the model *said* it was passing. If you're only asserting on the model's final answer, a silently-wrong page three will grade as a pass, because the model has no way to know it saw the wrong page.
