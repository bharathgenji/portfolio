---
title: "A Cache Write Nobody Reads Costs More Than No Cache At All"
date: "2026-09-02"
summary: "Prompt caching isn't a free discount you can slap on every request — a write that never gets a matching read is a price increase, not a savings."
tags: ["agents", "cost"]
status: draft
author: "Bharath"
---

## The invoice that went up after "optimizing" it

A team added `cache_control` to their system prompt across the board — every agent, every call, on the theory that caching can only help. Total spend went up 9% the following week. Nobody had changed the prompt, the model, or the traffic. What changed was that roughly a third of their agents were multi-tenant tools where the system prompt embeds a tenant's config (feature flags, a custom glossary, scoped tool list) directly at the top of the prompt, before the cache boundary. Each tenant's prefix is unique. Most tenants send well under one request per five minutes. Every one of those calls was writing a cache entry that expired, unread, before the tenant's next request arrived.

## Caching has a write premium, not just a read discount

The number everyone remembers is the read discount: a cache hit costs roughly 10% of the standard input price. The number people forget is that a cache *write* costs more than a normal call, not the same — on Anthropic's API it's about 1.25x the base input price for the default 5-minute TTL. That premium is the cost of the extra compute to persist the KV state. It's not optional and it's not refunded if nothing ever reads the entry back.

Work out the breakeven for N calls that share one prefix:

```
cost_with_cache    = 1.25 + 0.10 * (N - 1)   # one write, N-1 reads
cost_without_cache  = 1.00 * N
```

Solve for equality and N ≈ 1.3. In plain terms: if the same exact prefix gets reused at least twice inside the TTL window, caching wins, usually by a lot. If it gets used exactly once — written and never read again — you paid 25% more than doing nothing.

## The failure mode is cardinality, not volume

This isn't about low-traffic systems in general; a single-tenant agent making one call every ten minutes is fine, because there's nothing to worry about — there's no cache to have paid for either way if you don't enable it, and if you do, an unread write there is a rounding error. The expensive version is high-*cardinality*, moderate-traffic systems: total request volume looks healthy, but each request's prefix is unique enough — because it embeds a tenant ID, a per-user permission set, a session-specific tool list — that no two calls in the same five-minute window ever share a prefix. The aggregate call count hides that every individual prefix is a population of one.

## Measure hit rate per prefix shape before you flip the switch

```python
def cache_efficiency(records: list[dict]) -> float:
    reads = sum(r["cache_read_tokens"] for r in records)
    writes = sum(r["cache_creation_tokens"] for r in records)
    return reads / writes if writes else 0.0
```

An efficiency ratio under roughly 2 means your writes aren't earning back their premium — cut the cache boundary above the tenant-specific content, or don't cache that prefix shape at all. Group by tenant, not globally: a global average of 8 can hide a whale tenant carrying the number while forty low-volume tenants are all paying the write tax with zero reads. Cache the part of the prompt that's identical across every caller. Put the part that makes the prefix unique after the boundary, where an uncached write costs exactly what an uncached write has always cost — nothing extra.
