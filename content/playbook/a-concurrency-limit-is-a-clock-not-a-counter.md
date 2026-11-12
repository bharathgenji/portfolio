---
title: "A Concurrency Limit Is a Clock, Not a Counter"
date: "2026-11-12"
summary: "Your RPM quota says you have headroom for two hundred concurrent agents — the provider's separate concurrent-requests cap is measuring something your RPM math never accounted for."
tags: ["agents", "infrastructure", "latency"]
status: draft
author: "Bharath"
---

## The capacity plan that checked the wrong number

A team sizing an agent fleet did the obvious math: their plan allowed 1,000 requests per minute, each agent run made about five model calls, so they could run roughly 200 concurrent agents before touching the RPM ceiling. They provisioned for 150 and started rolling traffic. Errors showed up at 40 concurrent runs — not rate-limit errors, but `429 Too Many Concurrent Requests`, a second, separate cap on simultaneous in-flight calls that their RPM arithmetic never touched. The quota page even listed it, as its own number, right next to RPM. Nobody had multiplied it out because the RPM math looked sufficient on its own.

## RPM counts arrivals; concurrency counts occupancy

RPM is a rate — how many requests you're allowed to *start* per minute. A concurrent-requests cap is an occupancy limit — how many requests are allowed to be *open* at once, and a request stays open for its entire duration, not for an instant. These two numbers only agree if every call is roughly the same length. Agent calls aren't. A classification call might return in 400ms; a tool-calling turn with extended thinking and a long generation can hold its slot for 20-30 seconds. The RPM-based estimate implicitly assumes a call duration that was never written down anywhere, and the real average was five to ten times longer than whatever number made the arithmetic come out to "200 concurrent agents."

The relationship you actually want is Little's Law: average concurrency equals arrival rate times average time in the system.

```python
rpm = 1000
avg_call_seconds = 22        # measured, not assumed
arrivals_per_second = rpm / 60
expected_concurrency = arrivals_per_second * avg_call_seconds
# ~366 — already past most tiers' concurrent-request ceiling,
# despite being nowhere near the RPM ceiling
```

Nobody needs to hit 1,000 RPM for this to bite. A fleet running at a fraction of its RPM budget can still blow through its concurrency cap the moment calls get slow, because concurrency scales with *duration*, and duration is the variable the RPM-only estimate dropped.

## Track the gauge, not the rate

Fix the measurement before you fix the capacity. Emit a live gauge of in-flight requests — increment on dispatch, decrement on completion — and alert on it directly instead of inferring headroom from RPM:

```python
in_flight = Gauge("agent_requests_in_flight")

async def call_model(*args, **kwargs):
    in_flight.inc()
    try:
        return await client.messages.create(*args, **kwargs)
    finally:
        in_flight.dec()
```

That gauge is the actual number your provider is enforcing. If it's sawtoothing near the cap while your RPM dashboard shows plenty of slack, the gauge is the one to believe.

## Pool slow calls separately

Extended-thinking calls and long-generation calls don't belong in the same concurrency pool as fast lookups — a handful of slow runs can occupy enough slots to queue out a much larger number of fast ones that would otherwise finish in milliseconds. Split the pool the same way you'd split a [[give-agents-their-own-rate-limit-pool]] bucket, but key it on expected call duration instead of workload identity, and size each pool from Little's Law, not from a fraction of RPM you never measured against real call times.
