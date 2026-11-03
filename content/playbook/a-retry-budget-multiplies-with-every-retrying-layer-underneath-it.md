---
title: "A Retry Budget Multiplies With Every Retrying Layer Underneath It"
date: "2026-11-03"
summary: "You set max_attempts=3 at the agent layer and assumed that was the ceiling — it's a multiplier on every other retry loop already running underneath it."
tags: ["agents", "reliability", "tools"]
status: draft
author: "Bharath"
---

A support agent called a `create_ticket` tool wrapped in a retry decorator — `max_attempts=3`, exponential backoff, the standard thing. One day a downstream API started timing out intermittently, and support started getting duplicate tickets: two, sometimes three, for a single request. The on-call engineer checked the retry decorator's logs: it had fired exactly once per request, exactly as configured. The duplicates weren't coming from the layer anyone was watching.

They were coming from the HTTP client inside the tool. `requests` was mounted with a `Retry` adapter — `total=3`, also exponential backoff, added months earlier by someone fixing a different flaky-network incident and long forgotten. Every "single" call the agent's retry decorator made was already up to three calls by the time it reached the wire. One real timeout turned into as many as nine actual POSTs, several of which succeeded just slowly enough to look like a fresh failure to the layer above.

## Nobody owns the multiplication

Each layer's test suite is clean, because [[test-your-tools-in-isolation]] tests each layer in isolation — mock the HTTP client, verify the decorator retries three times; mock the decorator, verify the client retries three times. Nothing in either test exercises the other layer, so nothing catches that they stack. The agent framework's retry count is a *ceiling on attempts at its own layer*, not on attempts total. Add a load balancer or API gateway with its own retry-on-5xx policy — common, and usually configured by a different team entirely — and the real worst case is the product of all three: 3 × 3 × 3 = 27 attempts for what every dashboard reports as "retried, succeeded."

For an idempotent read, this is wasted latency and nothing worse — and it still turns your p99 into a multi-second detour nobody budgeted for. For a non-idempotent write like `create_ticket`, it's duplicated side effects, and no amount of per-layer correctness review catches it, because every layer is correct on its own terms.

## Pick exactly one owner

Don't try to make every layer retry-aware of every other layer — that's a coordination problem that breaks the next time someone adds a layer. Instead, pick one layer as the sole retry authority and force every layer below it to make exactly one attempt:

```python
# HTTP client: no retries — the tool wrapper owns this decision
session.mount("https://", HTTPAdapter(max_retries=Retry(total=0)))

# Tool wrapper: the one place max_attempts actually means max_attempts
@with_retry(max_attempts=3, backoff=1.5)
def create_ticket(payload: dict) -> dict:
    return session.post(TICKETS_URL, json=payload, timeout=5).json()
```

If a load balancer or gateway sits between you and the API and you don't control its retry policy, that's layer zero — budget for it rather than fighting it, and make the call idempotent (stable idempotency key, not a fresh one per attempt) so you're safe no matter how many times it actually fires.

## The audit

Grep your stack for every place a retry decorator, a `Retry()` adapter, or an SDK's built-in `max_retries` default is configured — SDKs for cloud providers love shipping retries on by default. Multiply them. That product, not any single layer's `max_attempts`, is your real worst-case attempt count and your real worst-case latency, and it's the number to check against whether the underlying call is actually safe to run that many times.
