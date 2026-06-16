---
title: "Give Your Tools a Batch API"
date: "2026-06-14"
summary: "Single-item tool APIs force agents into N sequential calls — the same N+1 problem that plagues database-backed apps, but more expensive."
tags: ["agents", "tool-design", "latency"]
status: published
author: "Bharath"
---

Every database-backed app eventually hits the N+1 query problem. Agents hit the same problem with tools, and it's worse: each extra round trip costs you an LLM turn.

The pattern is predictable. Your agent calls `search_tickets("payment failure")`, gets back 15 ticket IDs, then calls `get_ticket(id)` in a loop — 15 separate tool calls, 15 context round-trips, and if you're not doing parallel execution, 15 sequential model invocations. You're spending money and burning latency fetching one item at a time while the agent dutifully follows the only API you gave it.

## What causes it

You built the tool for the simple case:

```python
def get_ticket(ticket_id: str) -> dict:
    return db.tickets.find_one({"id": ticket_id})
```

This is fine when you need one ticket. But agents frequently discover a list and then need to act on every item in it. A single-item API forces N sequential calls. The agent isn't misbehaving — it's doing exactly what you asked.

## The fix

Add a batch variant. Keep the singular for the cases that need it; add a plural for everything else.

```python
def get_tickets(ticket_ids: list[str]) -> list[dict]:
    return list(db.tickets.find({"id": {"$in": ticket_ids}}))
```

Now the agent calls `get_tickets(["t-1", "t-2", ..., "t-15"])` in a single tool call and gets everything back at once. One LLM turn, one round trip, one entry in the context window instead of fifteen.

## When you can't add a batch endpoint

If the upstream API doesn't support batching, fall back to parallel tool calls — fire all N calls in a single model response rather than sequentially. That gets you concurrency without requiring API changes. But it still costs more context than a true batch, because each result becomes a separate message. Parallel is better than sequential; batch is better than parallel. Design for batch first.

## The tool description is half the fix

Don't just add `get_tickets` and assume the model will reach for it. Models default to the singular pattern they've seen most. Tell it explicitly:

```
get_tickets: Use when you have multiple ticket IDs and need their details.
             Prefer this over calling get_ticket() in a loop.
```

Without that nudge, you'll add a batch tool and watch the agent ignore it.

## The pairing principle

Every list-returning tool you expose implies that the agent will need to process each item in that list. Design the downstream tool to match: if you expose `list_users`, also expose `get_users`. If you expose `search_documents`, also expose `fetch_documents`. Keep them paired.

This is a cheap investment at design time. The cost of not making it shows up in every trace — in latency, in token spend, and in the quiet frustration of watching an agent slowly loop through a list that should have taken one call.
