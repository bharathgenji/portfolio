---
title: "A Retry-After Header Doesn't Know How Many Agents Are Reading It"
date: "2026-10-03"
summary: "Obeying Retry-After exactly is the textbook-correct move for one client and a self-inflicted outage for a thousand of them."
tags: ["agents", "reliability", "infrastructure"]
status: draft
author: "Bharath"
---

## The second outage

A team running a document-processing pipeline had 400 agent workers pulling from a queue, each one calling the same third-party extraction API. Load spiked, the API started returning 429s with `Retry-After: 4`, and every worker's retry logic did exactly what the spec tells you to do: it slept for 4 seconds and tried again. Four seconds later, 400 workers hit the API in the same 50-millisecond window. The API, which had mostly recovered, saw a spike it couldn't absorb and handed back another wave of 429s — this time with `Retry-After: 4` again. The pipeline oscillated between "mostly working" and "everyone rate-limited" for twenty minutes, not because the API was fragile, but because the retry logic was perfectly correct for a world with one caller in it.

## Retry-After is a scalar, your fleet is a distribution

The header answers "when will capacity free up," which is a true fact about the server. It says nothing about how many other clients just received the identical instruction. When every client treats a shared, deterministic signal as its personal retry clock, the clients re-synchronize themselves every time they were briefly out of phase — the opposite of what backoff is supposed to do. This is the same failure shape as a cache stampede or a cron job that everyone scheduled on the hour: the trigger is shared, so the response is shared, so the load is shared, right at the moment you least want it to be.

Exponential backoff with no jitter has this problem even without a `Retry-After` header, for the same reason. A `Retry-After` header makes it worse because it removes the small random variance that per-client backoff timers would otherwise have accumulated from differing error-arrival times — the server is handing every client the exact same number.

## Jitter the header, don't obey it

Treat `Retry-After` as a floor, not a schedule:

```python
def compute_delay(retry_after: float, attempt: int) -> float:
    floor = retry_after
    spread = min(retry_after * 0.5, 2 ** attempt)
    return floor + random.uniform(0, spread)
```

Every worker still waits at least as long as the server asked. None of them wait the *same* amount of time. A fleet of 400 workers now arrives back at the API spread across a window instead of stacked on a single tick, and the second wave of 429s — the one caused by the retry itself — mostly doesn't happen.

## Scale the jitter window to fleet size, not to taste

A spread of a few hundred milliseconds is plenty for ten workers and useless for ten thousand — the window needs to be wide enough that the arrival rate across it stays under whatever capacity the server just told you it has. If you know your fleet size, size the jitter window so that `fleet_size / window_seconds` lands comfortably under the API's advertised or observed rate limit, not just "enough randomness to feel safe." A jitter window picked by feel is a coin flip on whether this incident repeats at your next traffic spike instead of a fix for it.

This is the same boundary [[give-agents-their-own-rate-limit-pool]] draws between workloads — except here the synchronization isn't from sharing a bucket, it's from every caller reading the same clock off the same response header.
