---
title: "Test Your Tools in Isolation, Not Through Your Agent"
date: "2026-06-24"
summary: "When your agent fails, you need to know if the tool returned bad data or the model misread good data — and you can't tell unless you've tested them separately."
tags: ["agents", "testing", "reliability"]
status: draft
author: "Bharath"
---

Your agent does something wrong. You pull the conversation trace, scan through a dozen tool calls, and try to reason backwards. Did `get_order()` return stale cache? Did `search_inventory()` time out and silently return empty? Or did the model get perfectly correct data and still make a bad decision?

Without isolation, every failure is ambiguous. You'll diagnose the wrong layer and fix nothing.

## Tools are functions. Test them that way.

Every tool your agent calls is just a function with inputs and outputs. It doesn't need a model to test it.

```python
# The tool
def get_order(order_id: str) -> dict:
    row = db.query("SELECT * FROM orders WHERE id = %s", order_id)
    if not row:
        return {"error": "not_found", "order_id": order_id}
    return serialize_order(row)

# Tests — no model, no agent loop, no conversation trace
def test_get_order_missing_id():
    result = get_order("does-not-exist-999")
    assert result["error"] == "not_found"

def test_get_order_shape():
    result = get_order(FIXTURE_ORDER_ID)
    assert "status" in result
    assert "line_items" in result
    assert "created_at" in result
```

The model never appears in these tests. That's the point.

## Test what models actually produce

Don't just test the happy path. Models generate surprising inputs: empty strings, `null`, negative quantities, dates in unexpected formats, IDs that look plausible but don't exist. Your tool will encounter all of these eventually. Test them before that happens in production.

Test the exact *shape* of what your tool returns, not just whether it runs. The model reasons over your return value verbatim. A tool that returns `{"data": {"order": {...}}}` when you expected `{"order": {...}}` will silently mislead the model on every single call. The model won't complain — it'll just confidently use the wrong field path.

Test error paths explicitly. If `search_inventory()` should return `{"error": "upstream_timeout"}` when the warehouse API is slow, verify that's actually what comes back — not an exception that gets swallowed somewhere, not a 200 with an empty body, not a missing key the model treats as None.

## The payoff compounds

Once you have a tested tool library, every agent failure becomes a cleaner signal. You're not debugging a black box — you're debugging a model that had access to known-good inputs and still made a bad call. That cuts your search space in half.

It also makes tool changes safe. You want to change how `search_inventory()` ranks results? Update the function, run the tool tests, confirm the output shape is still correct, then run your agent evals to see whether task performance actually improved. Without the layer separation, any regression could be hiding anywhere.

Teams that skip tool unit tests end up in a pattern where every eval failure kicks off a two-hour investigation that ends with "oh, the tool was returning the wrong field name." Write the tests. It takes twenty minutes and saves the investigation.

The tools your agent calls are an API. They deserve the same test discipline as any other API you'd ship.
