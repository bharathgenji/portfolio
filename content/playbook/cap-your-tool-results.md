---
title: "Your tool results are eating your context window"
date: "2026-06-03"
summary: "A single unfiltered database dump or web page fetch can consume half your token budget — and the failure mode is silent degradation, not a crash."
tags: ["agents", "latency", "production"]
status: draft
author: "Bharath"
---

In a single-turn call, context budget barely matters. In a multi-turn agent loop — reason, call tool, reason, call tool — it compounds fast. Each tool result gets appended to the conversation history and stays there. A `fetch_page` call returns 25,000 characters. A `run_sql_query` dumps 500 rows. A `list_files` returns every path in a monorepo. By turn 6, the model is reasoning inside a context that's 80% tool output noise.

The failure mode is subtle: the model doesn't crash. It silently loses track of earlier reasoning, starts contradicting itself, or forgets instructions that were set 60,000 tokens ago. You see degraded outputs but can't pinpoint the cause because nobody logged token counts per turn.

## Cap output at the call site

The simplest fix: wrap every tool execution to enforce a hard output limit. Don't trust tool implementations to be context-aware — they aren't.

```python
MAX_TOOL_CHARS = 8_000

def run_tool(name: str, args: dict) -> str:
    result = TOOLS[name](**args)
    if len(result) > MAX_TOOL_CHARS:
        omitted = len(result) - MAX_TOOL_CHARS
        return result[:MAX_TOOL_CHARS] + f"\n\n[...truncated — {omitted:,} chars omitted]"
    return result
```

One line in your system prompt completes the pattern: "Tool results may be truncated. If you need more detail, use a narrower query." Now the model knows partial output is possible and asks for a tighter filter rather than treating a truncated dump as the full truth.

## Design tools that expose only what's needed

Truncation is a safety net, not the real fix. Real fix: tools that return the right amount of information by default.

- Add `limit` and `offset` to any tool that returns multiple records
- Return summary metadata by default; provide a separate tool for full detail
- Prefer `search_orders(query, limit=10)` over `get_all_orders()`

A tool that *can* return 10,000 rows *will* eventually return them — the model asks for "all orders" more often than you'd expect. Frequent truncation events in your logs are a signal: the model is reaching for too broad a query, which is usually a tool description problem. If it's grabbing everything when it only needs a few rows, the description probably doesn't tell it that a narrower path exists.

## Log context growth in staging

Log the total token count of the conversation at every turn during development. Watch how it grows. Agents that look fine in demos — where tasks are clean and data is small — routinely hit context limits at turn 10–12 in production.

One number to know per turn: tokens consumed so far. One threshold to set: if context exceeds 70% of maximum, emit a warning. That warning in staging costs nothing to act on. The same problem surfacing as silent degradation in production — with real users, real data, real consequences — costs considerably more.

The context window is a shared resource your entire agent run has to live inside. Treat tool results as the biggest spender, because they usually are.
