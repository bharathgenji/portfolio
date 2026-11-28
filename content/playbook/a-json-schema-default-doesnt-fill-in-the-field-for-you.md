---
title: "A JSON Schema Default Doesn't Fill In the Field for You"
date: "2026-11-28"
summary: "The 'default' keyword in a tool schema is a comment the model reads, not a value the API injects — write your handler like the field might just not be there."
tags: ["agents", "tool-use", "schemas"]
status: draft
author: "Bharath"
---

A search tool took `query` and an optional `max_results`, schema'd as `"default": 10`. It worked in every manual test because whoever wrote the tests always passed both fields. In production, the model started omitting `max_results` on simple queries — reasonably, since the schema told it 10 was already the default — and the handler did `args["max_results"]`. KeyError, on maybe 15% of calls, with no pattern anyone could spot from the error alone.

## The default never left the schema

`default` in JSON Schema is documentation. It's a hint for UI generators that pre-fill a form field, and a hint for the model reading the schema about what happens if it leaves something out. No part of a tool-calling pipeline — not the model, not the API, not your validator unless you wired one up specifically to do this — reaches into the arguments object and inserts that value when the field is missing. The arguments you get back are exactly what the model decided to send. If it decided "10 is already the default, no need to repeat it," your handler receives `{"query": "..."}`  and nothing else.

This is easy to miss because it behaves like a Python keyword argument everywhere *except* the one place it actually runs. You write the schema next to a function signature that has `max_results: int = 10`, your eyes see the same `10` in two places, and it reads as redundant rather than as two independent claims that have to be kept in sync by hand.

## Write handlers that assume absence

```python
def handle_search(args: dict) -> dict:
    query = args["query"]
    max_results = args.get("max_results", 10)  # not args["max_results"]
    return search(query, max_results=max_results)
```

Required fields can stay indexed access — the schema's `required` list is the one thing here that *is* enforced, by most providers, before the call ever reaches you. Everything marked optional needs `.get()` with the real default, every time, with no exceptions for "the model always sends it anyway."

## Keep one default, not two

The deeper fix is to stop hand-writing the schema default next to the function default at all. Generate the schema from the same object that defines the handler's defaults — a Pydantic model, a Zod schema, a dataclass with `field(default=10)` — so there's one source of truth instead of two numbers that happen to match today and silently diverge the next time someone tunes one without the other.

## The tell

If a tool call fails only on the calls where an optional argument is missing, and your tests never reproduce it because your tests always pass every field, you're not looking at a flaky tool — you're looking at a schema default that was never wired to anything. Grep your handlers for bracket access on any field not in `required`.
