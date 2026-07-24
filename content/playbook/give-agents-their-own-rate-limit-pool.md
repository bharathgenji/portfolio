---
title: "Give Agents Their Own Rate Limit Pool"
date: "2026-07-20"
summary: "An agent stuck in a retry loop shouldn't be able to eat the API quota your paying users depend on — but it will, if you let it share a bucket with them."
tags: ["agents", "reliability", "infrastructure"]
status: published
author: "Bharath"
---

## The incident that shouldn't have been an incident

An agent hits a flaky downstream API, retries with backoff, and — because the task genuinely calls for it — ends up making forty calls to the same third-party service in three minutes. That third-party service enforces one rate limit per API key. Your human-facing product uses the same key, because it was the key that was already configured and nobody thought to split it. Real users start seeing 429s on features that have nothing to do with the agent. The agent didn't crash anything; it starved something else that shared its plumbing.

This is not a bug in the agent's retry logic. Backoff-and-retry is correct behavior for the agent in isolation. The bug is architectural: two workloads with wildly different traffic shapes were put behind one gate.

## Human traffic and agent traffic are different distributions

Human-facing requests are bursty but bounded — a person can only click so fast, and idle time between actions is the default. Agent traffic looks nothing like that. A single agent run can legitimately fire dozens of calls in a tight loop with no human pacing it, and a bug or a bad prompt can turn "dozens" into "thousands" before anyone notices. Sizing a shared rate limit pool for human behavior means it has no slack for agent behavior, and any capacity you add to absorb agent bursts is capacity a human-facing incident didn't need.

## Partition the pool, not just the metric

Attributing cost per tool ([[instrument-cost-per-tool-not-per-run]]) tells you what happened after the fact. Rate limit isolation prevents the failure mode in the first place, at the point where the call is made:

```python
LIMITERS = {
    "user_facing": TokenBucket(rate=200, burst=50),
    "agent":       TokenBucket(rate=50, burst=10),
}

def call_api(request, pool: str):
    if not LIMITERS[pool].acquire():
        raise RateLimited(pool=pool, retry_after=LIMITERS[pool].reset_in())
    return client.request(request)
```

Two buckets, two keys if the provider supports multiple, two connection pools if it's your own infrastructure. The exact split matters less than the separation — the failure boundary is what you're buying, not the specific numbers.

## Extend the boundary per agent, not just per workload

Once you've split agent traffic from human traffic, the same argument applies one level down: one runaway agent instance shouldn't be able to exhaust the pool other agent instances need. Key the limiter by run ID or tenant, not just by "agent" as a single category, the same way you'd put a bulkhead in front of any shared resource ([[put-a-bulkhead-in-front-of-shared-tools]]). A stuck agent should degrade its own run — timing out or failing loudly — not degrade every other run competing for the same bucket.

The fix costs a second bucket and a routing decision at the call site. The alternative is paging someone because a background job made your checkout flow flaky, and nobody being able to explain why for twenty minutes.
