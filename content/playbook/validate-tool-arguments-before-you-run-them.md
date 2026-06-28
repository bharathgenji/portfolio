---
title: "Validate tool arguments before you run them"
date: "2026-06-28"
summary: "JSON schema says the call is valid — your business rules might disagree. A semantic validator at the tool boundary is cheaper and safer than repeating constraints in the prompt."
tags: ["agents", "reliability", "tools"]
status: draft
author: "Bharath"
---

The model emits a function call. Your tool runtime checks the JSON schema: types match, required fields are present. Execution proceeds.

That validation is necessary but not sufficient. "Valid JSON" and "safe to run" are different things.

## What schema validation misses

A correctly typed call can still be semantically broken:

- `limit: 5000000` — valid integer, will scan your entire table
- `date: "2025-13-45"` — valid string, not a real date
- `user_id: -99` — valid integer, no such user exists
- `table: "audit_log_raw"` — valid string, restricted to ops team only

The model doesn't know your domain constraints. It knows what a number is, not that your search endpoint caps at 100 results. Every constraint you leave out of the validator has to live in the system prompt instead — where it gets ignored, diluted across turns, or dropped entirely when you compress context.

## The pattern

Add a semantic validation layer between the model's tool call and actual execution. This is a plain function, not an LLM call.

```python
RESTRICTED_TABLES = {"audit_log_raw", "admin_sessions", "billing_events"}
MAX_LIMIT = 100

def validate_search_args(args: dict) -> str | None:
    """Return an error string if invalid, None if OK."""
    limit = args.get("limit", 10)
    if limit > MAX_LIMIT:
        return f"limit {limit} exceeds maximum of {MAX_LIMIT}"

    date_str = args.get("date")
    if date_str and not is_valid_iso_date(date_str):
        return f"'{date_str}' is not a valid ISO date"

    table = args.get("table")
    if table in RESTRICTED_TABLES:
        return f"table '{table}' requires elevated access"

    return None

# In your tool dispatch:
error = validate_search_args(tool_args)
if error:
    return {"error": error}  # Return to model, don't throw
```

Return the error as a tool result rather than raising an exception. The model almost always self-corrects on the next turn — it treats a validation error like any other informative response and tries again with corrected arguments.

## Why code beats prompt

When a domain constraint lives in a validator, it's enforced unconditionally. When it lives in a system prompt, it's a suggestion the model weighs against everything else in context. For hard limits — row caps, restricted resources, invalid formats — code is the right place.

This also compresses your prompts. You don't need to repeat "never query more than 100 rows" in the system prompt if the tool physically cannot run with limit > 100. Remove the instruction; trust the code.

## What not to validate here

Don't validate things that require a round-trip to know — whether a record exists, whether the API is up, whether the result will be empty. Those are runtime concerns, handled by your error-return and retry layers. Validate only parameters that are deterministically wrong before execution, independent of system state.

The boundary is: if you can check it with pure logic or a lookup table in under a millisecond, it belongs in the validator. If it requires I/O, let it run and handle the failure downstream.

## The payoff

Three things get better when you add this layer:

**Safety moves to code.** Domain rules are enforced once, at the boundary, not duplicated across prompt versions.

**Failures become legible.** A validation rejection is a named, structured event you can log and trace. A hallucinated argument that silently degrades a query result is not.

**The model recovers gracefully.** Because you're returning errors rather than throwing, the model stays in the loop and can self-correct — often in a single additional turn.

The principle: the system prompt is the wrong place to enforce invariants. Constraints that are always true should be in code.
