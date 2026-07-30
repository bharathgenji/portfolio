---
title: "Your Tool List Is Part of the Cache Prefix"
date: "2026-07-27"
summary: "Scope your tools per phase and retrieve them dynamically, and you've quietly broken the prompt cache you built to save money — the two techniques fight each other unless you know where the boundary is."
tags: ["agents", "cost", "caching"]
status: published
author: "Bharath"
---

## Two good ideas that cancel each other out

If you scope tool sets to the current phase, or retrieve the top-k relevant tools per turn instead of shipping your whole library, you've done the right thing for accuracy and safety. If you've also cached your prompt prefix to cut cost and latency, you've done the right thing for your bill. Ship both at once and someone will notice the cache hit rate collapsed the same week tool scoping went live, with no obvious connection between the two.

The connection is that tool definitions aren't a side channel — they're part of the prefix. On Anthropic's API, `tools` is serialized into the request ahead of your cached system block, and the cache key covers everything up to the cache boundary, tool schemas included. Change which tools are present, or reorder them, and you've changed the prefix. A different prefix is a cache miss, full stop, regardless of whether your system prompt text is byte-identical to the last call.

## Why this is easy to miss

The two optimizations live in different parts of the codebase and get built by different people at different times. Tool scoping is a control-flow decision — which functions are in scope for `run_phase("research")`. Cache prefix ordering is a request-construction decision — what goes before the `cache_control` marker. Nobody reviewing either change is looking at the other's effect, and your cache hit rate metric, if you have one, reports an aggregate that doesn't tell you *why* it dropped.

```python
# research phase: 3 tools -> one cache key
tools=[web_search, read_file, fetch_url]

# draft phase: 2 tools -> a *different* cache key
tools=[read_file, write_scratch]
```

Both calls share the same system prompt text. Neither shares a cache entry, because the tool array precedes the cached block and differs between them.

## What to do about it

**Cache per phase, not per run.** If your tool sets are stable within a phase (even if they differ across phases), you get one cache entry per phase instead of zero. A multi-phase agent with three phases and thousands of runs still gets real hit rates — just three cold starts per run instead of one, not the total collapse you get from per-turn dynamic retrieval.

**Put retrieved tools after the cache boundary, not before it.** If you're doing embedding-based tool retrieval, keep a small fixed core (your `done` tool, escape hatch, whatever's needed every turn) ahead of the cache marker, and treat the dynamically retrieved tools as request-time variation downstream of it — the same way you'd treat retrieved documents or user messages. You lose caching on the variable part, which you were never going to get anyway, without losing it on the part that was actually static.

**Measure the tradeoff before you assume it's worth it.** Tool retrieval saves tokens on the tool schemas themselves; prompt caching saves compute on the reprocessed prefix. At small tool counts and high call volume, caching a slightly larger static set can beat retrieving a smaller dynamic one. Don't guess — run both configurations against your eval set and compare actual cost, not intuition about which optimization sounds more sophisticated.
