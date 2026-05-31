---
title: "Write tool descriptions that actually get used"
date: "2026-05-31"
summary: "The model decides whether to call your tool based on its description. A vague description is a bug."
tags: ["agents", "tool-calling", "patterns"]
status: published
author: "Bharath"
---

Most agent tool problems aren't schema problems. They're **description** problems.

A JSON schema tells the model what shape the input should be. The *description* tells it when to reach for the tool, what it does, and — critically — what it doesn't do. The model reads that description every time it decides whether to call anything at all. Garbage in, garbage out.

## The model is making a decision, not a lookup

When an agent reasons through a task, it's not scanning a list of function signatures. It's reading natural language and deciding: "given what I'm trying to do, does this tool help?" Your description is the pitch. If it's vague, the model guesses. If it's wrong, the model misuses it.

Two descriptions for the same tool:

```
# Bad
"name": "search",
"description": "Search for information."

# Good
"name": "search_knowledge_base",
"description": "Search the company's internal knowledge base for HR policies,
product docs, and support runbooks. Use when the user asks about internal
procedures or product specs. Do NOT use for live data or general web questions
— this index is static and updated weekly."
```

The first will cause the model to call `search` for things it can't answer, and skip it for things it can. The second tells the model exactly when to reach for it and when to stay away.

## Write the trigger condition, not just the function

The most useful thing you can put in a description isn't what the tool does — it's **when to call it**. Think of it as writing the `if` clause that lives in the model's head:

- "Use this when you need the current date or time" — not just "returns the current time"
- "Call this before any database write to verify user permissions" — not just "checks permissions"
- "Use only when the user explicitly requests a refund" — not "processes refunds"

Trigger-first descriptions prevent two failure modes: the model skipping a tool that would've helped, and the model calling one it shouldn't.

## Describe the negative space

Tell the model what the tool does *not* handle. This is the most reliably skipped part of tool design, and it causes some of the worst failures. If your `get_order_status` tool only covers orders from the past 90 days, say so — otherwise the model will confidently call it for a two-year-old order and return garbage.

A sentence of negation is worth three of description.

## Parameter descriptions are half the job

The model fills in parameters based on their names and descriptions. `{"type": "string"}` tells it nothing. `"description": "ISO 8601 date string, e.g. '2026-05-31' — use today's date if the user hasn't specified one"` tells it exactly what to do.

Every parameter should answer: what format does this expect? What are the valid values? What should the model do if it's uncertain?

## How to catch bad descriptions

Run your agent on a representative set of inputs and log every tool call — including the ones that *didn't* happen. The interesting signal is when the model should have called a tool but didn't, or reached for the wrong one. This is what your eval suite is for: you'll see in the grading output that the agent hit the web instead of the knowledge base, or skipped the permissions check entirely.

A description bug shows up clearly in the trace. Fix the description, not the prompt.
