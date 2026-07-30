---
title: "Parallel Tool Calls Need a Concurrency Story for Writes"
date: "2026-07-28"
summary: "You parallelized independent tool calls for latency, then two of them turned out to write the same row — and the last one to finish quietly won."
tags: ["agents", "concurrency", "reliability"]
status: published
author: "Bharath"
---

## The bug that only shows up under load

You did the right thing: the model calls three tools in one turn, you `gather()` them instead of awaiting one at a time, and your p95 latency drops. Weeks later, someone reports that a customer's shipping address reverted to an old value for no reason. You can't reproduce it locally. It only happens in production, and only sometimes.

What happened: the agent called `update_customer_address` and `update_customer_preferences` in the same parallel batch. Both handlers do a read-modify-write against the same customer row — read the record, mutate one field, write the whole record back. Fired concurrently, both reads see the same starting state, and whichever write lands last overwrites the other's change. Nothing crashed, nothing logged an error, no retry fired. The result was just quietly wrong.

## "Independent" describes intent, not data access

[[parallel-tool-calls]] are the right call when the tools don't depend on each other's *output*. But that's a claim about the task, not about the storage layer underneath. Two tools can look unrelated at the API boundary — `update_customer_address`, `update_customer_preferences` — and still share a row, a cache entry, or a file. The model has no visibility into your schema. It only knows the two calls don't need each other's return value, which is a real and correct reason to run them in parallel. It just isn't sufficient to make them safe to run in parallel.

This is the same bug distributed systems have always had with concurrent writers. What's new is that the thing deciding to fire both calls at once is a model choosing to parallelize for speed, not an engineer who traced the call graph first.

## Fix it at the write, not at the model

Don't try to teach the model your data model. Make the write path safe regardless of what arrives concurrently:

```python
def update_customer_field(customer_id: str, field: str, value, expected_version: int):
    updated = db.execute("""
        UPDATE customers SET {field} = %s, version = version + 1
        WHERE id = %s AND version = %s
    """.format(field=field), (value, customer_id, expected_version))
    if updated.rowcount == 0:
        raise ConflictError(f"customer {customer_id} changed since read, retry")
    return updated
```

Optimistic concurrency control — a version column and a conditional write — turns the silent overwrite into a loud, retryable conflict. One of the two concurrent writes wins cleanly; the other gets a `ConflictError` your tool layer can turn into a typed error the model retries against fresh state, the same way you'd [[return-errors-to-your-agent-dont-throw-them]].

The narrower fix, where it applies: make each tool patch a single field with an atomic update (`UPDATE ... SET address = %s WHERE id = %s`) instead of read-modify-write against the whole row. If two calls never touch the same column, there's nothing to race.

## Draw the write-conflict graph once, per tool set

Before you ship parallel tool calling, do the exercise once: list every tool that writes, and note what storage it touches — table, row scope, file, cache key. Two tools that write disjoint resources are safely parallel by construction. Two that can touch the same resource need either a version check, a lock, or a merge into one tool that owns the whole row — the same three options you'd reach for merging tools with a real output dependency.

This graph doesn't change often — do it when you add a tool, not per request. It's a few minutes of tracing against a bug report that shows up only in production, correlates with load, and has no stack trace pointing at it.

## The tell

If a bug only reproduces under concurrency, doesn't throw, and involves two writes to overlapping state, you're not looking at a prompt problem. You're looking at a storage layer that assumed its callers were sequential, now getting called in parallel because you correctly optimized for latency somewhere else.
