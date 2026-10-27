---
title: "A File ID Is a Cache Entry, Not a Permanent Pointer"
date: "2026-10-27"
summary: "A document you uploaded once and reused by ID for weeks will eventually 404 — and the error shows up on a call nowhere near the one that cached it."
tags: ["agents", "reliability", "production"]
status: draft
author: "Bharath"
---

## The nightly job that worked for three weeks

A team built a recurring pipeline: upload a contract PDF through the provider's file-upload endpoint once, store the returned file ID next to the contract record, and reference that ID in every nightly summarization call afterward instead of re-uploading the bytes each time. It worked. For three weeks. Then a handful of nightly runs started failing with `file_not_found` — not for new contracts, for old ones, and not for all of them, just the ones nobody had touched in a while. The team's first theory was a database migration had corrupted some rows. It hadn't. The file IDs were fine. The files behind them were gone.

## The mental model that broke

A foreign key into your own database is permanent until you delete the row. A file ID from a provider's upload endpoint is not that — it's a handle into storage you don't own, governed by a retention policy you didn't set and aren't notified about when it lapses. Nothing in the shape of the ID tells you it's time-bound. It looks exactly like a durable identifier right up until the call that dereferences it comes back 404, which is often a pipeline stage far downstream of wherever the ID got cached, making the error look like it belongs to that stage instead of to an upload from three weeks ago.

This is the same category of failure as [[an-mcp-oauth-token-can-expire-mid-run]]: a credential or reference with a lifecycle external to your code, that fails silently-looking (a generic error, not a self-describing one) exactly when nobody's watching the clock on it.

## Treat the ID like a cache, because it is one

Store a content hash alongside the file ID, not just the ID itself. The hash is what lets you re-upload idempotently — same content, same cache key, no duplicate files piling up — the same discipline [[idempotent-agent-actions]] applies to writes generally.

```python
def get_file_id(doc: Document) -> str:
    cached = file_cache.get(doc.content_hash)
    if cached and cached.age_days < SAFETY_MARGIN_DAYS:
        return cached.file_id
    file_id = upload_file(doc.bytes)
    file_cache.set(doc.content_hash, FileRef(file_id, uploaded_at=now()))
    return file_id
```

Then handle the failure mode explicitly at the call site, instead of letting a 404 bubble up as a generic pipeline error:

```python
try:
    return client.messages.create(..., file_id=get_file_id(doc))
except NotFoundError:
    file_cache.invalidate(doc.content_hash)
    return client.messages.create(..., file_id=get_file_id(doc))  # re-upload, retry once
```

Two things make this work: a safety margin well inside the provider's stated retention window, so you re-upload before expiry rather than discovering it in production, and a retry path keyed on the specific "reference not found" error class rather than a blanket retry-on-any-failure, which would mask real problems with the document itself.

## The rule

Any identifier a third-party API hands back to you carries that API's lifecycle, not yours. Before you cache it for reuse, find out what "reuse" is actually bounded by — and build the re-fetch path before the expiry does it for you, on a Tuesday night, three stages away from where the ID was born.
