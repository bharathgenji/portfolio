---
title: "A Cache Hit Still Counts Against Your Context Window"
date: "2026-09-23"
summary: "Prompt caching makes tokens cheaper and faster, not smaller — teams that treat a high cache-hit rate as headroom find out at 190k tokens that the meter was never about cost."
tags: ["agents", "caching", "context"]
status: draft
author: "Bharath"
---

## The run that had a 92% cache-hit rate and still errored

A coding agent kept a long-lived session alive across a full afternoon of edits — read a file, cache it, edit, re-read, cache again, over and over. The team was proud of the cache-hit rate on the dashboard: 92% of input tokens were being served from cache, cost per call was down to a fraction of list price, and nobody was watching the one number that mattered. Four hours in, a call failed with a context-length error. The session had accumulated 190,000 tokens of file contents, tool results, and conversation history. Almost all of it was cache hits. All of it still had to fit in the window.

This is the confusion prompt caching quietly invites: a cache hit changes what you're billed and how long you wait, not how much of the context window the request occupies. The model still has to have those tokens present — as KV state, reconstructed from cache — to attend over them when generating the next token. Cheap and fast is not the same as absent.

## Two different limits, two different knobs

Cost and latency are a function of how many tokens get *freshly processed*. That's the number caching shrinks, sometimes by 90%.

Context capacity is a function of how many tokens are *present in the request*, full stop — cached or not. That number is set by the model's context window and caching does nothing to it. A 200k-token model caps you at 200k tokens whether every single one of them is a cache hit or none of them are.

Teams that only instrument the cost dashboard have no visibility into the second number. The cache-hit rate looks great right up until the request that doesn't fit, and by the time that error shows up, the fix isn't a caching tweak — it's an emergency compaction pass on a session nobody was tracking the size of.

## Instrument both numbers, not just the one you're billed on

```python
def log_request_shape(usage, context_limit: int):
    total = usage.input_tokens + usage.cache_read_input_tokens
    metrics.gauge("context_tokens_used", total)
    metrics.gauge("context_pct_used", total / context_limit)
    metrics.gauge("cache_hit_rate", usage.cache_read_input_tokens / max(total, 1))
```

`cache_hit_rate` tells you what you're paying. `context_pct_used` tells you how close you are to a hard wall. Alert on the second one independently — a session at 95% cache-hit and 95% context capacity is not a healthy session, it's one call away from failing, and the cost dashboard alone will never tell you that.

## Compaction and caching are not in tension, but they are in competition

This is why [[compact-agent-context-mid-run]] and [[cache-your-prompt-prefix]] have to be reconciled, not just both implemented. Compacting the middle of a long conversation invalidates every cache breakpoint downstream of the edit — you're trading a cache-cold next call for headroom in the window. That trade is correct once you're actually approaching the limit. It's a bad trade if you're triggering it reflexively every N turns regardless of how full the window actually is, because you're paying the cache-miss cost on every compaction without the context pressure that justified it.

Trigger compaction off `context_pct_used`, the number caching can't shrink — not off a token-cost budget, which caching already solved for you and which will stay flat for hours right up until the window itself runs out.
