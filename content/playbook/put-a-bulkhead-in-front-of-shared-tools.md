---
title: "Put a Bulkhead in Front of Shared Tools"
date: "2026-07-06"
summary: "Fifty parallel agent runs hitting the same enrichment API don't fail because the API is down — they fail because nothing capped how many could hit it at once."
tags: ["agents", "reliability", "concurrency"]
status: draft
author: "Bharath"
---

## The outage you cause yourself

You parallelize a batch job — five hundred documents, each handled by its own agent run, each run calling the same vector DB and the same third-party enrichment API. Every individual run is well-behaved: it has a circuit breaker, it retries transient errors, it times out its calls. None of that helps, because the problem isn't that the downstream service is unhealthy. It's that two hundred runs started within the same second and the service has a concurrency limit of twenty.

You get rate-limit errors, which trigger retries, which add more concurrent load, which trips your circuit breakers, which fails runs that would have succeeded if they'd simply waited their turn. The postmortem says "third-party outage." It wasn't. You did that.

## Circuit breakers and retries solve the wrong axis

A circuit breaker asks "is the downstream healthy?" A retry policy asks "was this specific failure transient?" Neither asks "how many of these are in flight right now?" — and that's the question that actually prevents this failure mode. What you need is a bulkhead: a hard cap on concurrent calls to a given resource, enforced independently of how many agent runs exist.

```python
_semaphores: dict[str, asyncio.Semaphore] = {}

def get_semaphore(resource: str, limit: int) -> asyncio.Semaphore:
    if resource not in _semaphores:
        _semaphores[resource] = asyncio.Semaphore(limit)
    return _semaphores[resource]

async def call_tool(resource: str, fn, *args, limit: int = 20):
    async with get_semaphore(resource, limit):
        return await fn(*args)
```

The semaphore lives per-resource, not per-run. Run number 400 waits behind runs 1 through 20 instead of piling on top of them. Nothing downstream ever sees more than twenty concurrent calls, regardless of how many agents you spin up. If your agents run as separate processes rather than one process pool, move the semaphore to Redis or your existing rate-limiter — the mechanism matters less than the fact that the limit is shared, not per-instance.

## Bulkheads compose with what you already have

This isn't a replacement for circuit breakers or retries — it's upstream of both. Order of operations: the bulkhead controls how many calls are attempted at all; the circuit breaker trips if the ones that get through start failing; retries handle the individual transient error. Skip the bulkhead and the other two spend their time reacting to a self-inflicted wound instead of a real one.

## Give tenants their own bulkhead

If you're running agents on behalf of multiple customers against a shared resource, one global semaphore lets a single tenant's burst starve everyone else. Key the semaphore by `(resource, tenant_id)` with a per-tenant limit, plus a smaller global ceiling as backstop. This is the same fair-share problem load balancers solved decades ago, showing up again at the tool-call layer.

## Sizing the limit

Don't guess. Check the downstream's documented rate limit or load-test it, then set your limit meaningfully below that ceiling — leave room for your own retries and for other consumers of the same API. Watch semaphore wait time as a leading indicator: if runs are queuing for seconds before they even attempt the call, you're either under-provisioned or need to raise the limit, and you'll know which because you measured, not guessed.

Any tool called by more than one concurrent agent run needs a bulkhead. It's a dictionary and a semaphore. The alternative is an incident report that blames a vendor for a limit you exceeded yourself.
