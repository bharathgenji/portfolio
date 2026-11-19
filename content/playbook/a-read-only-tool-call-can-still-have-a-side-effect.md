---
title: "A Read-Only Tool Call Can Still Have a Side Effect"
date: "2026-11-19"
summary: "Labeling a tool 'read-only' doesn't make the API behind it read-only — and your retry logic, your cache, and your concurrency limits all believe the label."
tags: ["agents", "tools", "reliability"]
status: draft
author: "Bharath"
---

A support agent calls `list_messages` to catch up on a thread before replying. Harmless — it's a GET, it's in the "safe to retry, safe to cache, safe to call in parallel with anything" bucket in your tool dispatcher. Except the mail provider's API marks every message it returns as read. The agent just silently cleared a human agent's unread queue, and nobody notices until someone asks why tickets keep showing as handled when they weren't.

Nothing in the tool call was wrong. The bug is upstream of the model entirely: whoever classified that tool as read-only was going by HTTP verb, not by what the backend actually does when you call it.

## "Read-only" is a claim about behavior, not a GET

A few real examples that look read-only and aren't:

- **SQS `ReceiveMessage`** — doesn't delete anything, but it hides the message from every other consumer for the visibility timeout. Call it twice without deleting and you've effectively dropped a message.
- **Rate-limited "check my quota" endpoints** — some providers count the check itself against the quota. Polling it inside a retry loop burns the budget you're trying to protect.
- **Audit/compliance "view" endpoints** — fetching a customer record for context can itself write an access-log entry that feeds a GDPR or SOC2 alerting pipeline. Call it from three parallel sub-agents building the same context and you've generated three audit events for one logical read.
- **Pagination cursors** — a "list next page" call that advances server-side cursor state is read-only in output, mutating in session state. Retry it after a timeout and you can skip a page, not repeat one.

None of these fail a code review that checks "does this call `INSERT` or `UPDATE`." They fail a review that asks what state changes on the other side of the API boundary.

## Where the label gets trusted blindly

The label "read-only" doesn't just sit in a docstring — it gets consumed by infrastructure that acts on it without re-checking:

```python
CACHEABLE = {"get_account", "list_messages", "get_quota"}  # "it's just a read"
RETRYABLE_WITHOUT_DEDUP = CACHEABLE                         # same assumption, reused
PARALLEL_SAFE = CACHEABLE                                   # reused again
```

Every one of those sets inherited the classification from the first person who looked at the tool and thought "GET, fine." A cache serves a stale read. A blind retry double-consumes a queue message. A parallel-safe flag triples an audit write. The mistake happens once, at classification time, and then gets multiplied by every system downstream that trusts it.

## Classify by backend contract, not HTTP method

Before marking a tool read-only in your dispatcher, answer one question for the actual API behind it: if I call this twice with identical arguments, is the second call's effect on the world identical to the first? Not "does it return the same data" — does calling it *change anything that a different call, or a different consumer, will observe*? If you don't know, go read the provider's docs for that specific endpoint, because "GET" is not evidence either way. If the answer is "it changes something," it belongs in the same bucket as a write: no blind caching, no blind retries, no assumption that three parallel calls are free.
