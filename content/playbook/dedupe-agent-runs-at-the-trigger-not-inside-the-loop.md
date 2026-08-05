---
title: "Dedupe Agent Runs at the Trigger, Not Inside the Loop"
date: "2026-08-05"
summary: "Webhooks fire at-least-once, users double-click, queues redeliver — if you only made your agent's actions idempotent, you're still paying for and racing full duplicate runs."
tags: ["agents", "reliability", "production"]
status: published
author: "Bharath"
---

## The duplicate you don't see coming

A Stripe webhook fires. Your handler starts an agent run to process the dispute. The request takes 400ms longer than Stripe's timeout, so Stripe retries — same event, same payload, a few seconds later. You now have two agent runs reasoning about the same dispute concurrently, neither aware the other exists.

This isn't an edge case. Stripe, GitHub, Zendesk, and every major queue (SQS, Pub/Sub) all guarantee *at-least-once* delivery, never exactly-once. A user double-clicking "generate report" is the same failure shape with a human trigger instead of a network one. If your agent is wired to any external event source, duplicate triggers are a certainty, not a risk.

## Idempotent actions don't fully cover you

The standard advice is to make every mutating action idempotent — an idempotency key on each write, checked before it commits. That's necessary, but it protects the *database*, not the *run*. Two concurrent agent runs still both burn full token budgets reasoning through the same task. They can still race each other on read-then-decide logic that has no natural idempotency key, like "check inventory, then decide whether to reorder" — both runs read the same stale count and both decide to reorder. And if one run's tool calls are idempotent but another isn't (a Slack notification, a log write), you get partial duplication that's hard to spot in review because nothing errored.

Idempotency stops a duplicate from corrupting state. It doesn't stop a duplicate from starting.

## Lock the run before you start it

Derive a stable key from the trigger — the webhook's event ID, a hash of `(user_id, action, input)`, whatever uniquely identifies *this* intent rather than *this* delivery attempt. Acquire a lock on that key before any model call happens:

```python
def start_run(event_id: str, task: dict):
    lock_key = f"run_lock:{event_id}"
    acquired = redis.set(lock_key, "1", nx=True, ex=RUN_TIMEOUT_SECONDS)
    if not acquired:
        return {"status": "duplicate_suppressed", "event_id": event_id}
    try:
        return run_agent(task)
    finally:
        redis.delete(lock_key)
```

`nx=True` makes the set a no-op if the key exists — that's your dedupe. The `ex` TTL matters as much as the lock itself: set it to comfortably exceed your agent's worst-case run time, or a crashed run leaves a lock nobody releases, and every retry of a legitimately failed run gets silently swallowed as a "duplicate." Log every suppressed duplicate with its event ID — if that count creeps up, it's telling you your upstream retry interval is shorter than your agent's run time, which is a capacity problem, not a locking bug.

## Both layers, not either

Run-level locking stops concurrent duplicates. Action-level idempotency stops sequential ones — the lock expires, the same event redelivers an hour later, and now you need the idempotency key to make the replay a no-op instead of a second charge. Ship both. They're solving adjacent halves of the same at-least-once problem, and neither substitutes for the other.
