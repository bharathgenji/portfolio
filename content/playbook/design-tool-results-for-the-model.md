---
title: "Design tool results for the model that reads them"
date: "2026-06-29"
summary: "Your tool returns clean JSON your code can parse — but the model is reading it too, and internal IDs, cryptic field names, and raw status codes are eating your reasoning quality."
tags: ["agents", "tools", "context"]
status: published
author: "Bharath"
---

## The mismatch nobody notices until it bites them

Your agent calls `get_order`. It returns this:

```json
{
  "id": "ord_x9k2m",
  "uid": "usr_449f",
  "st": 2,
  "ts_created": 1719648000,
  "ts_updated": 1719734400,
  "ln_ct": 3,
  "fl_del": false
}
```

Your API consumer parses this fine. Your model has to guess that `st: 2` means "shipped," that `fl_del` is a soft-delete flag, and that `ts_created` is Unix time — and it has to carry that decoding work on top of whatever task it was actually supposed to accomplish.

Tool results live in the model's context window. They're not consumed by code; they're *read*, the same way the model reads everything else. Field names, numeric codes, and internal identifiers that make sense in your database schema become noise when a model has to reason through them.

## Build a presentation layer

Web developers have been solving this for years: raw DB rows go through a DTO or view model before leaving the API. Apply the same pattern to your tools.

```python
def get_order(order_id: str) -> dict:
    raw = db.orders.find(order_id)
    return {
        "order_id": raw["id"],
        "status": STATUS_LABELS[raw["st"]],   # "shipped", not 2
        "placed": format_date(raw["ts_created"]),
        "last_updated": format_date(raw["ts_updated"]),
        "item_count": raw["ln_ct"],
        "customer_id": raw["uid"],
    }
```

Three rules that cover most cases:

**Use natural language values, not codes.** `"status": "shipped"` is unambiguous. `"status": 2` forces the model to recall your lookup table — and it might get it wrong.

**Strip fields the model won't use for this task.** Audit timestamps, internal flags, foreign keys that lead nowhere — they aren't free. Every field is tokens the model must process and decide to ignore. That's a tax on every reasoning step that follows.

**Add context when the result is surprising.** If an account is suspended, say so explicitly: `"account_status": "suspended — billing lapsed 14 days ago"`. Don't make the model infer it from `is_active: false` and then wonder why.

## The reasoning cost is real

A model that receives ambiguous tool results spends reasoning steps decoding before it can act. This surfaces in ways that look like model errors but aren't:

- It misreads a status code and takes the wrong action
- It fires a clarifying tool call it didn't need to (latency hit, extra tokens)
- It hedges in its output because the data wasn't conclusive

These aren't hallucinations. They're design mistakes. The model did exactly what you'd expect a smart reader to do with confusing input.

## The intern test

Before finalizing a tool result shape, ask: if I showed this JSON to a smart person who has never seen my internal schema, would they understand what it means without a data dictionary? If yes, the model will too. If not, you're outsourcing your schema knowledge into the model's reasoning budget.

This is a short refactor per tool. It pays back in fewer wrong actions, fewer redundant follow-up calls, and traces where you can actually see what the model knew before it decided.
