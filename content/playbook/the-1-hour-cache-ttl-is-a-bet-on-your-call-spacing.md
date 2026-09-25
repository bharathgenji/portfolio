---
title: "The 1-Hour Cache TTL Is a Bet on Your Call Spacing"
date: "2026-09-25"
summary: "Flipping every prompt cache breakpoint to the extended TTL looks like a free upgrade — it's a higher write price that only pays for itself if your calls actually land inside the window it buys you."
tags: ["agents", "caching", "cost"]
status: draft
author: "Bharath"
---

## The upgrade that made things worse

A team running a document-review agent with a human approval step in the middle read that Anthropic supports an extended, one-hour cache TTL instead of the default five minutes, and flipped every `cache_control` block in the codebase to `ttl: "1h"` in one PR. Cost went up. Not for the approval-gated workflow they were trying to fix — for every other agent in the fleet that fires calls back-to-back, sub-second apart, with no gap longer than the default TTL ever covered anyway.

The extended TTL isn't a strictly-better version of the default. It's a different price for a different bet, and applying it uniformly means paying the higher price on workloads that never needed it.

## What you're actually trading

The default ephemeral cache lasts five minutes and costs roughly 1.25x the base input price to write, with hits priced at a tenth of the base rate. The extended TTL stretches that window to an hour, but the write costs roughly 2x base — a real premium, paid once per prefix, not per turn, since a hit refreshes the TTL without triggering another write.

That "once per prefix" detail is the whole trade. If your calls are already spaced under five minutes apart — a tight reason-act-observe loop, a synchronous multi-turn chat — the default cache is already hitting on every call. The extended TTL buys you nothing there; you're paying 2x to write a cache you'd have kept warm for free at 1.25x.

The extended TTL earns its keep in exactly one shape of workload: calls to the same static prefix that are spaced *more* than five minutes but *less* than an hour apart. That's [[human-approval-is-a-snapshot-not-a-guarantee]]-style workflows waiting on a reviewer, async pipelines polling a job handle between steps, or a support thread where the customer takes ten minutes to reply. Without the extended TTL, every one of those gaps is a full cache miss — you pay a fresh 1.25x write on top of full-price processing, every single time the gap exceeds five minutes. With it, one 2x write covers however many of those gaps land inside the hour.

## Apply it where the gap lives, not globally

```python
def cache_block(content: str, expects_gap: bool):
    ttl = "1h" if expects_gap else "5m"
    return {"type": "text", "text": content,
            "cache_control": {"type": "ephemeral", "ttl": ttl}}
```

Set this per breakpoint, per workflow — not as a global config flag. The system prompt on your synchronous chat agent and the system prompt on your approval-gated review agent are both "static content behind a cache boundary," but they see completely different call-spacing distributions, and [[your-prompt-cache-only-gets-four-breakpoints]] means you've only got four chances per request to get each one right.

## Measure before you flip the flag

Before setting any breakpoint's TTL, look at the actual distribution of gaps between calls that share that prefix. If p50 is under five minutes, the default already covers you and the extended TTL is a pure loss. If p50 sits between five minutes and an hour, the extended TTL is very likely a net win. If calls routinely go longer than an hour apart, neither option saves you — you're paying a full write either way, and the fix is architectural, not a TTL setting.
