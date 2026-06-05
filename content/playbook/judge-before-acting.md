---
title: "Add a judge call before high-stakes agent actions"
date: "2026-06-05"
summary: "When your agent decides to write to a database or send an email, 'it looked right' isn't a safety strategy — a cheap secondary check is."
tags: ["agents", "reliability"]
status: draft
author: "Bharath"
---

When your agent writes to a database, sends an email, or calls a payment API, the output isn't a response — it's an action. The failure mode changes. A bad summary is annoying. A bad SQL `DELETE` is a disaster.

The pattern I reach for: a second, lightweight model call that acts as a judge before any high-stakes action executes. The judge reads the proposed action and a rubric; if it flags an issue, the agent pauses or escalates instead of acting.

## The judge call

The judge doesn't need to be smart. It needs to be fast, cheap, and explicit about what it's checking. A smaller model with a tight prompt handles this better than asking a large model "does this look right?"

```python
JUDGE_PROMPT = """
You are reviewing a proposed database operation before it executes.
Flag as UNSAFE if ANY of the following are true:
- The SQL modifies more than 100 rows
- The WHERE clause is missing or unbounded
- The operation targets the orders or payments table without an explicit user_id filter

Respond with JSON: {{"safe": true/false, "reason": "..."}}

Proposed SQL:
{sql}
"""

def judge_sql(sql: str) -> dict:
    result = llm(CHEAP_MODEL, JUDGE_PROMPT.format(sql=sql))
    return json.loads(result)
```

The rubric is the whole thing. "Is this safe?" is not a rubric. "Would this query run against more than 100 rows?" is. Enumerate the failure modes you actually care about, not a general vibe.

## What makes a good judge

**Narrow scope.** One judge per action category — SQL, outbound emails, API calls. A single "judge all actions" prompt is too broad to be reliable.

**Binary output.** The judge decides safe or unsafe, not a confidence score. If you need a score, your rubric isn't specific enough yet.

**Explicit denial criteria.** Write the rubric as a list of "flag if..." conditions. This forces you to enumerate your actual risk surface before shipping — which is half the value.

## When to use it

Not every action warrants a judge call. Read-only operations don't need it. Add a judge for:

- Any SQL write, especially `DELETE` or `UPDATE`
- Outbound messages (email, Slack, SMS)
- External API calls that cost money or trigger webhooks
- File system writes outside a sandboxed temp directory

## The cost argument

A judge call on a cheap model — Haiku, Gemini Flash — costs a fraction of a cent and adds under 100ms. If the action it's guarding risks a customer support incident or irreversible data loss, the economics are obvious. The question isn't whether you can afford the judge; it's whether you can afford to skip it.

## What this isn't

This isn't a replacement for evals, idempotency, or access controls. The judge is a runtime sanity check — it catches cases where the model produced a syntactically valid but semantically dangerous action. It won't catch everything, which is why it belongs *alongside* those other layers, not instead of them.

The principle: anything that crosses the boundary from "model reasoning" into "real-world state change" deserves a second look. A 100ms judge call is a cheap way to get it.
