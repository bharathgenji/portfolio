---
title: "Cache your prompt prefix. You're paying for it twice otherwise."
date: "2026-06-01"
summary: "Your system prompt gets re-processed on every API call — unless you structure your prompt so the static parts land in the cache."
tags: ["agents", "cost", "latency"]
status: draft
author: "Bharath"
---

Every time your agent calls the model API, the provider processes your entire prompt from scratch. Your system prompt — the 1,500 tokens of instructions, persona, tool descriptions, and few-shot examples — gets re-tokenized and fully computed on every single call. For an agent that makes 15 model calls per run, you're processing that system prompt 15 times.

Prompt caching fixes this. When the leading portion of your prompt is identical across calls, the provider can cache the KV state from processing those tokens and reuse it. Cache reads cost a fraction of a full pass — Anthropic charges roughly 10% of the standard input price for a cache hit. Latency drops too, because cached tokens skip the compute step entirely. For a tight agent loop — reason, call tool, reason, call tool — that latency compounds across every turn.

## The one rule that makes or breaks the cache

Caching only works when **the first N tokens of your prompt are identical across calls**. The moment you put dynamic content before your static content, you bust the cache for every call.

Wrong order:
```
[Retrieved documents — changes every call]
[System prompt — static, 1500 tokens]
[User message — changes every call]
```

Right order:
```
[System prompt — static, 1500 tokens]
[Retrieved documents — changes per call]
[User message — changes per call]
```

On Anthropic's API, you mark the cache boundary explicitly:

```python
messages=[{
    "role": "user",
    "content": [
        {"type": "text", "text": SYSTEM_PROMPT,
         "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": retrieved_context},
        {"type": "text", "text": user_message},
    ]
}]
```

The ephemeral cache lasts five minutes. For a reasoning loop with back-to-back model calls, the cache stays hot across every turn.

## Two common patterns that silently bust the cache

**Dynamic content in the system prompt.** The most common offender: `"Today is {date}"` injected at the top of the system prompt. That string changes daily — every call is a miss. Move it to the user turn. Same goes for per-session or per-user state injected into the system prompt. If it varies, it belongs downstream of the cache boundary.

**Tool descriptions that reference live data.** If you're generating tool descriptions at runtime (e.g., "Available orders: 3,451 open, 219 pending"), those tokens change with every call. Keep tool descriptions static; pass live counts as a separate tool call result.

## When it actually matters

For an agent handling 100 calls/day with a 1,500-token system prompt, the savings are modest. For one running 10,000 calls/day — a customer support bot, a code review agent, anything multi-tenant — the cost difference is real, and the latency improvement compounds across every step of every run.

The fix is almost entirely structural. You're not changing what the agent knows or how it reasons — you're changing the *order* you say things in. That's an unusually cheap win.
