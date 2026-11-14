---
title: "An A/B Test on Your System Prompt Forks Your Cache Too"
date: "2026-11-14"
summary: "Split traffic between two system prompt variants and you've also split one warm cache population into two cold ones — and the cost comparison between arms is lying to you until both catch up."
tags: ["agents", "cost", "caching"]
status: draft
author: "Bharath"
---

## The variant that looked more expensive

A team testing a reworded system prompt against the incumbent saw variant B costing noticeably more per call in the first day of the experiment, even though both prompts were close to the same token count. The instinct was to blame the wording — maybe B's phrasing was nudging the model into longer completions. It wasn't. B was simply cold.

Before the experiment, every call hit one prompt and built up one warm cache entry, with a hit rate that climbed over hours of traffic. The moment you split traffic 50/50 between two prompt variants, you don't have one cache with two slightly different requests landing on it — you have two separate cache prefixes, each warmed by half the call volume it used to get. Lower volume per prefix means a longer runway to steady-state hit rate, and during that runway every miss is billed at full input price instead of the cache-read discount. The arm that happens to warm up slower, usually just by the luck of which calls landed first, looks like the more expensive prompt. It isn't more expensive. It's younger.

## Why this compounds with more arms

The effect scales with however many variants you're running, not just whether you're running two. A four-way test over the same traffic quarters the volume hitting each prefix, and the five-minute ephemeral TTL on Anthropic's cache means a prefix that doesn't get hit again within that window writes a fresh cache every time instead of reading one. At low enough volume per arm, a variant can spend its entire experiment permanently cold, writing instead of reading on nearly every call, long after the control arm stabilized.

## Separate the cache question from the quality question

```python
def route_variant(session_id: str) -> str:
    bucket = hash(session_id) % 100
    return "variant_b" if bucket < split_pct else "control"

# Before comparing cost per call across arms, normalize for
# cache state — don't read the raw billed total.
def billed_cost(call: Call) -> float:
    if call.cache_read_tokens:
        return call.cache_read_tokens * CACHE_READ_RATE + call.fresh_tokens * BASE_RATE
    return call.input_tokens * BASE_RATE  # cold write, no discount yet
```

Log `cache_read_tokens` versus fresh tokens per call, per variant, and hold the cost comparison until both arms have hit rates in the same range — not just the same wall-clock duration. A four-way split needs roughly four times the calls of a two-way split before the arms are even comparable, because that's what it takes for each one to see the volume the full-traffic baseline used to get.

## What this changes about how you run the test

If your experiment is short or your traffic is modest, don't split small on many variants — you'll spend the whole window paying cold-cache prices on every arm and never isolate the actual quality or token-length difference the prompt wording caused. Run fewer variants, each getting enough volume to warm up inside the TTL, or extend the test duration until the cache noise washes out of the per-arm cost. Either way, report quality metrics and cost metrics on separate timelines — quality converges on sample size, cost converges on cache temperature, and those are rarely the same number of calls.
