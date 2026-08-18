---
title: "A Batch Tool Call Needs Per-Item Status, Not One Verdict"
date: "2026-08-16"
summary: "Fifteen items go into a batch tool call, three fail, and if your API can only say 'success' or 'error' the agent has no way to know which three — or whether to retry the twelve that worked."
tags: ["agents", "tool-design", "reliability"]
status: published
author: "Bharath"
---

## Twelve succeeded. The agent didn't know that.

A team building a data-cleanup agent gave it `update_records(ids: list[str], patch: dict)` — a batch tool that patched N rows in one call, built exactly the way [[give-your-tools-a-batch-api]] recommends: one round trip instead of N. It worked in every demo, because every demo batch succeeded completely. In production, batches of 20 routinely had one or two rows locked by another process, or already deleted, or failing a validation check the single-item tool had never needed to enforce.

The tool's error handling was written for the common case: try the batch, and if anything inside it throws, catch it and return `{"error": "3 of 20 updates failed"}`. The agent read that message and had exactly two options: retry all 20, which re-applied the patch to the 17 that had already succeeded, or give up on all 20, which abandoned 17 rows that were already correctly updated. Neither option was right, because the tool had thrown away the one piece of information that would have let the agent do the right thing: *which* three failed, and why.

## A batch is N operations, not one

The mistake is modeling a batch call's result as a single success/failure verdict when it's actually N independent outcomes that happen to share a request. Treat it that way in the response shape:

```python
def update_records(ids: list[str], patch: dict) -> dict:
    results = []
    for id in ids:
        try:
            db.update(id, patch)
            results.append({"id": id, "status": "ok"})
        except LockedError:
            results.append({"id": id, "status": "retryable", "reason": "row locked"})
        except NotFoundError:
            results.append({"id": id, "status": "failed", "reason": "record deleted"})
    return {"results": results}
```

Now the agent gets back exactly what it needs to act: 17 rows marked `ok` that it should leave alone, one marked `retryable` that it can resubmit alone or after a backoff, and one marked `failed` with a reason that tells it retrying is pointless and it should surface the problem instead. The distinction between `retryable` and `failed` matters as much as the per-item granularity — collapsing "try again" and "don't bother" into one `error` status just moves the same information-loss problem down a level.

## Design the retry path to accept a subset

This only pays off if the same tool can be called again with just the failed IDs. If `update_records` requires the full original list every time, the agent either has to remember and filter the ID list itself across turns — extra state, extra chances to drop something — or it re-sends everyone, including the rows it already knows succeeded. Let the tool take any subset of IDs and behave identically whether it's called with 20 or with the 3 that need retrying. That's the same idempotency property from [[idempotent-agent-actions]], applied per item instead of per call.

## Where a single verdict is fine

If the batch is transactional — all rows update together or none do, inside one database transaction — a single verdict is the correct and only honest answer, because there's no such thing as "12 succeeded" in that world. The per-item pattern applies specifically when the underlying operations are independent but you batched the *request* for latency. Check which one you actually built before you design the response shape: batching the call doesn't mean you batched the atomicity, and conflating the two is what produces a response that can't say what actually happened.
