---
title: "Agents fail mid-run. Make your actions idempotent."
date: "2026-05-30"
summary: "A transient error at step 4 of 7 shouldn't charge a customer twice or send the same email three times — but it will, unless you build for it."
tags: ["agents", "reliability", "production"]
status: published
author: "Bharath"
---

An agent that does work in the world — writes records, sends emails, charges cards, calls external APIs — is not the same animal as one that just answers questions. The big difference: **side effects accumulate across retries**.

A hallucinating agent is annoying. An agent that double-books a calendar invite or fires two Stripe charges because a network blip forced a retry is a support ticket, a refund, or a lawsuit. Idempotency is how you prevent this, and it's almost never mentioned in AI-agent tutorials.

## The failure pattern

An agent runs a seven-step workflow. Steps 1–4 succeed. Step 5 hits a timeout. You retry the whole run. Now steps 1–4 execute again — and maybe they're the ones that write to the database.

If each write is unconditional (`INSERT INTO orders ...`), you get duplicate records. If step 2 sends a confirmation email, the customer gets two. This isn't hypothetical: it's what happens in production the first week you have real traffic.

## The fix: idempotency keys

For any action that writes state or calls an external service, require a stable key that represents *this specific intent* — not *this retry*. Then make the action a no-op if that key has already been committed.

```python
def create_order(user_id: str, cart_hash: str, idempotency_key: str):
    if db.exists("orders", idempotency_key=idempotency_key):
        return db.get("orders", idempotency_key=idempotency_key)
    return db.insert("orders", user_id=user_id, cart_hash=cart_hash,
                     idempotency_key=idempotency_key)
```

The key should be derivable from the inputs, not generated at call time. `uuid4()` as the key is wrong — every retry produces a new one. A hash of `(user_id, cart_id, run_id)` is right — stable across retries of the same logical operation.

Most serious external APIs (Stripe, Twilio, SendGrid) accept an `Idempotency-Key` header — pass it, always.

## Checkpointing for long-running agents

For agents that run more than a few steps, add a checkpoint table. Before each action, log the step and its key. On retry, skip any step whose key is already committed:

```python
def run_step(run_id: str, step_name: str, fn, *args):
    key = f"{run_id}:{step_name}"
    if checkpoint_store.has(key):
        return checkpoint_store.get(key)
    result = fn(*args)
    checkpoint_store.set(key, result)
    return result
```

This pattern — borrowed from distributed workflow engines — makes every step in your agent loop resumable. The first successful execution is authoritative; retries read from the log.

## What to make idempotent and what not to

Not everything needs this treatment. Read-only tool calls (lookups, searches) are naturally idempotent — calling them twice costs tokens, not correctness. Focus your effort on:

- Database writes
- Outbound API calls (payment processors, email/SMS providers, webhooks)
- File or object storage mutations
- Anything that affects external shared state

The heuristic: if running a step twice would produce a different observable outcome, it needs an idempotency key.

## The production reality

Agents operating in real systems will encounter transient failures — rate limits, timeouts, flaky dependencies. Retries are not optional; they're how you maintain reliability. But retries without idempotency are a liability. The distributed-systems world solved this problem twenty years ago. Apply the same solution: every mutating operation gets a stable key, and the operation checks before it acts.

If you're launching an agent that touches real-world state, this is not an optimization. It's table stakes.
