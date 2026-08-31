---
title: "A oneOf Parameter Is a Routing Decision Wearing a Schema"
date: "2026-08-31"
summary: "One tool with a oneOf argument looks simpler than two tools — until the model has to pick a branch and fill its fields in the same breath, and the failures look like flakiness instead of what they are."
tags: ["agents", "tool-calling", "schema-design"]
status: draft
author: "Bharath"
---

## The tool that failed differently depending on phrasing

A scheduling agent had one tool, `create_event`, with a `oneOf` argument: either a `{type: "single", date}` shape or a `{type: "recurring", rrule, start_date, end_date}` shape. It looked like good schema design — one tool, one concept, the variants modeled explicitly instead of six loosely-related optional fields. In practice it failed on a specific class of request: "set up my Tuesday standup," where "Tuesday" is ambiguous between one specific Tuesday and every Tuesday going forward. The model would emit `type: "single"` and then, mid-object, include an `rrule` field anyway — a call that matched neither branch of the union and bounced off schema validation with "does not match any allowed schema," a message that tells the model nothing about which of its two decisions was wrong.

## Why this isn't the model being sloppy

A `oneOf` argument asks for two things at once: pick a branch, and fill that branch's fields correctly. With constrained decoding, the model commits to the discriminator token before it has finished reasoning about which variant actually applies — the grammar forces `"type":` to resolve before the rest of the object exists to inform it. When the underlying request is genuinely ambiguous, that early commitment is a coin flip, and everything generated after it is shaped by a decision the model didn't have enough information to make yet. Two tools don't have this problem, because tool selection happens as its own decision, before any argument-filling starts, and the model can reason in the transcript before choosing which one to call.

## Split the tool, not just the schema

The fix that actually worked was splitting `create_event` into `create_single_event` and `create_recurring_event`, each with a flat, non-union schema:

```python
create_single_event = {
    "name": "create_single_event",
    "description": "Create one calendar event on a specific date. Use when the user names a single occasion, not a repeating schedule.",
    "input_schema": {"type": "object", "properties": {"date": {"type": "string"}}, "required": ["date"]},
}

create_recurring_event = {
    "name": "create_recurring_event",
    "description": "Create a repeating calendar event. Use when the user describes a schedule ('every Tuesday', 'weekdays at 9am').",
    "input_schema": {
        "type": "object",
        "properties": {"rrule": {"type": "string"}, "start_date": {"type": "string"}, "end_date": {"type": "string"}},
        "required": ["rrule", "start_date"],
    },
}
```

Tool choice now happens where the model is best at it — reasoning in prose before selecting a name — instead of being buried inside argument generation where the only signal is a single enum token. The ambiguous "Tuesday standup" case didn't disappear, but it changed shape: the model now asks a clarifying question or picks a tool and states its assumption in the same turn, both of which are visible and correctable. A failed `oneOf` match was silent until validation; a wrong tool choice is visible in the trace the moment it happens.

## When a union is still fine

Not every discriminated union needs splitting. If the branches are genuinely never ambiguous from the request — an internal `type: "csv" | "json"` export format the caller always states explicitly — the discriminator isn't a judgment call, and a `oneOf` costs you nothing. The tell for when to split is whether picking the branch requires interpreting the user's intent. If it does, that interpretation deserves to happen as tool selection, in the open, not as the first token of a constrained object.
