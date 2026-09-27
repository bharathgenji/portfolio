---
title: "Prefetch the Tool Call You're Pretty Sure Is Coming"
date: "2026-09-27"
summary: "The model's next tool call is often obvious from the user's message alone — start it before the model asks, and the round-trip is free by the time it does."
tags: ["agents", "latency"]
status: draft
author: "Bharath"
---

## The order lookup that finished before the model asked for it

A support agent gets "where's my order #48213" and, three turns of context-gathering later, calls `get_order(order_id="48213")`. That number was sitting in the user's first message, in a regex-obvious position, the entire time. Waiting for the model to notice it, decide to call the tool, and stream out the arguments costs you a full model turn — 500ms to a couple of seconds, depending on load — for a lookup you could have kicked off before the model even started reasoning.

Speculative tool execution closes that gap: run a cheap heuristic over the incoming input, guess the tool call the model is almost certainly going to make, and fire it concurrently with the model's turn. If the guess matches what the model actually calls, you serve the cached result instantly. If it doesn't, you throw the speculative result away and execute the real call like normal — you're out one extra tool invocation, not correctness.

## Only speculate on calls you can safely throw away

The one hard rule: speculate only on tool calls with no side effects. A `get_order` lookup, a `search` call, a `read_file` — fine to fire and discard. A `refund_order` or `send_email` guessed wrong is now a side effect that happened and can't be un-happened. If a tool isn't read-only, it isn't a speculation candidate, full stop — the same boundary you'd draw for [[give-your-agent-a-dry-run-mode]].

```python
async def handle_message(user_message: str, session: Session):
    guess = extract_likely_call(user_message)   # cheap regex/heuristic, not a model call
    speculative = asyncio.create_task(execute_tool(guess)) if guess and guess.tool in READ_ONLY else None

    response = await run_agent_turn(user_message, session)
    real_call = response.tool_calls[0] if response.tool_calls else None

    if speculative and real_call and matches(guess, real_call):
        result = await speculative                 # already done or nearly done — instant
    else:
        if speculative:
            speculative.cancel()                    # guessed wrong or tool call never came
        result = await execute_tool(real_call) if real_call else None
```

`matches` has to compare the full argument set, not just the tool name. A guess of `get_order(order_id="48213")` against a real call of `get_order(order_id="48214")` is a miss — serving the speculative result anyway because "it called the right tool" hands the model data about the wrong order, silently. Same failure shape as [[a-tool-call-and-its-result-are-one-unit]]: the call and its arguments are one unit, and a match on part of the unit isn't a match.

## Where the heuristic comes from

Don't reach for a second model call to generate the guess — that just moves the latency you're trying to save into a different API call. Pull the guess from pattern matching on the raw input: order numbers, ticket IDs, and email addresses are usually recognizable by shape; intent classifiers you already run for routing often name the tool implicitly. If your traffic doesn't have an obvious extractable pattern, you don't have a speculation candidate — don't force it.

## What you're actually trading

You pay for a wasted tool call on every wrong guess. For a read-only lookup against your own database, that's noise. For a paid external API — a credit check, a third-party enrichment call — a low hit rate turns this into a cost problem with a latency rebate you didn't ask for. Measure your guess-match rate before you ship it, and cut the heuristic if it's guessing wrong more often than a coin flip; below that, you're not prefetching, you're doubling your tool traffic for a fraction of the wins.

This isn't a fit for every agent. It's a fit for the specific case where the input already contains the argument the model is going to ask for, and the tool is cheap and safe to call twice.
