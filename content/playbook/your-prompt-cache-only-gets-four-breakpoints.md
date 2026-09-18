---
title: "Your Prompt Cache Only Gets Four Breakpoints"
date: "2026-09-18"
summary: "Cache_control markers are a shared, hard-capped budget across the whole request — stack one per turn in a long conversation and the 400 shows up in production, not in the two-turn test that shipped it."
tags: ["agents", "caching", "cost"]
status: draft
author: "Bharath"
---

## It worked for the first four turns

A team wired up [[cache-your-prompt-prefix]] the recommended way: one breakpoint after the system prompt, one after the tool definitions, and — because someone read that caching the recent conversation window helps multi-turn agents — one more after each of the last couple of user turns, so a growing conversation could still get a partial hit on everything except the newest message. It worked in every test they ran. Then a support agent handling its sixth back-and-forth with a customer came back with a 400 on the model call, mid-conversation, with a customer waiting.

The error wasn't a rate limit or a malformed tool call. It was `cache_control array exceeds maximum size limit`. Every test conversation before launch was two or three turns long. Nobody hit the wall until a real user kept talking.

## Four is a request-wide budget, not a per-boundary allowance

Anthropic's API accepts at most four `cache_control` breakpoints in a single request, full stop — not four per section, not four per turn, four total across system prompt, tools, and messages combined. Each breakpoint marks "cache everything up to here," so the natural design instinct — put a marker at every stable boundary you can think of — runs out of budget fast the moment "stable boundary" includes something that recurs every turn.

The two static ones (system prompt, tool definitions) are basically free to spend, since they don't grow. The other two are the ones that get raided by whatever seemed convenient at the time: a marker per RAG batch, a marker per phase transition, a marker per retained turn. Any of those in isolation looks reasonable in review. Add two of them to a conversation that already spends two breakpoints on system and tools, and you're one dynamic marker away from a request that used to work.

## Move breakpoints forward, don't accumulate them

The fix isn't caching less — it's treating the two dynamic slots as a sliding window instead of an append-only log:

```python
def build_cache_markers(system_block, tools_block, turns):
    blocks = [system_block, tools_block]  # always cached, always present
    # only the trailing edge of the conversation gets the remaining two slots
    for turn in turns[-2:]:
        blocks.append(turn)
    for i, block in enumerate(blocks[:4]):
        block["cache_control"] = {"type": "ephemeral"}
    return blocks
```

Each new turn, drop the marker from the turn that's aging out and add it to the one that just arrived. You still get a hit on everything except the newest exchange — you just never hold more than four markers at once, no matter how long the conversation runs.

## Test past the length where it breaks

If your caching strategy assigns a breakpoint to anything that recurs — turns, batches, phases — the failure mode is length-dependent, not load-dependent. A two-turn smoke test will never find it; a real conversation eventually will. Run at least one eval conversation long enough to exceed whatever multiple of your recurring breakpoint you're planning for, and assert on the request shape, not just the response, before you trust the strategy in production.
