---
title: "Subagent Spawns Are Cache-Cold by Default"
date: "2026-08-25"
summary: "You tuned your prompt prefix for cache hits, then wrapped it in an orchestrator — and every subagent call is paying full price because a fresh spawn doesn't inherit anyone's cache."
tags: ["agents", "cost", "multi-agent"]
status: draft
author: "Bharath"
---

## The bill that didn't match the math

A team I worked with had done the cache work properly: static system prompt first, dynamic content after, cache_control on the boundary ([[cache-your-prompt-prefix]]). Their single-agent cost per call dropped by roughly 80%, matching the pricing sheet. Then they wrapped the same agent in an orchestrator that fans out to five subagents per run, and the aggregate bill came in near what the pre-caching cost would have predicted. The orchestrator's own calls were still cached fine. The subagent calls were not.

The reason is structural, not a bug: each subagent starts a new conversation. It gets its own system prompt, its own first user turn, its own KV cache lineage. Nothing about "this orchestrator already has a hot cache" transfers to a child, because the provider caches token prefixes for a specific request stream, not for your organization or your session. A subagent's first call is always a cold call, no matter how warmed-up the parent's cache is.

## Where teams get surprised

The trap is that this is invisible in isolation. Each subagent, viewed on its own, looks fine — one cold call followed by however many cached follow-up calls it makes internally, if it makes more than one. The problem is entirely about *count*: an orchestrator that spawns 5 subagents per run isn't paying for 1 cold start, it's paying for 5, every single run, forever. That cost doesn't show up until you multiply by fan-out and by call volume, which is exactly the multiplication [[fan-out-multiplies-failure-not-just-cost]] warns about for reliability — here it's the same shape of problem, but for spend.

## What actually helps

**Shrink what's cold, not just what's cached.** Since every subagent eats a full cold-prefix cost, that prefix should be as small as you can make it. A subagent doesn't need your orchestrator's full tool catalog or persona — give it the minimal system prompt for its one job ([[scope-tools-to-the-current-phase]]). A 200-token cold prefix five times over beats a 2,000-token one five times over, even though neither is cached.

**Reuse subagent identity across calls in the same run, not just within one.** If your orchestrator dispatches the same *kind* of subagent repeatedly — one grader call per retrieved chunk, say — route those through a single persistent subagent conversation instead of spinning up a fresh one per chunk. One cold start amortized over ten grading calls beats ten cold starts.

**Price fan-out by cold-start count, not by token volume alone.** When you estimate the cost of adding a fourth subagent to a pipeline, the marginal cost isn't "average tokens per subagent" — it's a full uncached prefix, every time. Multiply from there before you approve the design, not after the invoice.
