---
title: "Cache Read-Only Tool Calls Within a Run"
date: "2026-06-27"
summary: "Agents fetch the same data repeatedly without knowing it — a transparent cache at the dispatcher level stops the waste without changing any model behavior."
tags: ["agents", "cost", "performance"]
status: published
author: "Bharath"
---

Agents are more repetitive than you'd expect. One fetches a user's account record at the start of a run. Three tool calls later, it needs to check the user's plan tier — so it fetches the account record again. A few turns after that, it cross-references the account ID — and fetches it a third time. The model has no memory of having already retrieved this data. From its perspective, each call is the first.

This isn't a reasoning failure. It's an architecture gap. The model doesn't know whether calling a tool is expensive. It knows how to solve the problem, not how to minimize API calls while doing it. If you want deduplication, you have to build it into the dispatch layer.

## The fix

A transparent cache in your tool dispatcher is the right place for this. The model's behavior doesn't change — it still calls tools by name with arguments. Your infrastructure just intercepts identical calls and returns the cached result.

```python
import json
from typing import Any

class ToolDispatcher:
    CACHEABLE = {"get_account", "get_user_profile", "get_config"}

    def __init__(self):
        self._cache: dict[str, Any] = {}

    def run(self, name: str, args: dict) -> Any:
        if name not in self.CACHEABLE:
            return TOOLS[name](**args)
        key = f"{name}:{json.dumps(args, sort_keys=True)}"
        if key not in self._cache:
            self._cache[key] = TOOLS[name](**args)
        return self._cache[key]
```

One instance per run — create it, use it, discard it. The cache lives only as long as the run does. No shared state between runs, no invalidation logic required.

## What to cache

Cache tools that are purely read-only, deterministic for a given input, and unlikely to change during a run: account lookups, user profile fetches, feature flag reads, static configuration, schema introspection.

Don't cache tools with side effects, time-sensitive return values (prices, inventory, live queue depth), or anything that reads state the agent itself might be writing. A `get_order_status` call looks read-only, but if your agent can also call `update_order`, the status could legitimately change mid-run — and you'd silently serve stale data from cache.

The test: would you be comfortable calling this tool once and reusing the result for the entire run? If yes, cache it. If you'd want fresh data on a second call, don't.

## What to watch

Cache hits can mask bugs during development. If a tool has a bug that only appears on a second call with slightly different argument state, memoization hides it — the first result gets returned unconditionally. Run with caching disabled in your tool unit tests.

More importantly: log your hit rates. If `get_account` is hitting cache 60% of the time across production runs, that tells you something concrete about how the model actually uses the tool. It also tells you exactly how much external I/O you're avoiding. A cache hit rate of zero means the tool was a bad candidate and can be removed from the allowlist.

## The production case

The agents where this pays off most aren't the simple single-step ones. It's the multi-step research or workflow agents where the model is cross-referencing the same entities across many different subtasks. A support-ticket resolution agent might touch the same customer record a dozen times while building context, checking entitlements, and composing a response. Without caching, that's twelve identical database roundtrips. With it, it's one.

The same applies to external API calls that carry per-call cost: enrichment APIs, geocoding, translation, billing lookups. An agent that calls one of these four times in a run for the same input has just quadrupled your variable cost for that step.

The fix is about fifteen lines of code. The savings compound with agent complexity.
