---
title: "A Strict Schema Doesn't Enforce the Constraints It Can't Compile"
date: "2026-11-16"
summary: "pattern, minLength, and minimum read like guarantees in a tool schema — in strict/constrained-decoding mode, several of them are silently decorative."
tags: ["agents", "schema-design", "reliability"]
status: draft
author: "Bharath"
---

## The order IDs that were never actually checked

A fulfillment agent had an `order_id` parameter typed as a string with `"pattern": "^ORD-[0-9]{6}$"`. It shipped, passed review, and sat quietly for months. Then a downstream system started rejecting a slow trickle of lookups with malformed IDs — `ORD-4821`, `ORDER-108332`, one case of a UUID the model had invented wholesale. The schema said the field had to match that pattern. The schema was not the thing deciding what got emitted.

Strict mode — constrained decoding over a JSON Schema, available on most providers' structured-output and forced-tool-call paths — works by compiling your schema into a token-level grammar and restricting sampling to tokens that keep the output inside it. That compilation step only covers a subset of JSON Schema. `type`, `required`, `properties`, and `enum` compile cleanly into a grammar, because they constrain *shape*. `pattern`, `format`, `minLength`, `maxLength`, `minimum`, `maximum`, and `multipleOf` constrain *value*, and turning an arbitrary regex or numeric range into a token grammar is either impractical or unsupported by the provider's compiler. Depending on provider and version, those keywords get stripped before compilation, or kept in the schema object but never enforced — your tool definition still *shows* the constraint, which is exactly why it reads as if it's working.

## Decorative isn't useless, just not a guarantee

The dropped keyword usually isn't thrown away — it's still sitting in the schema text the model reads, so it acts as a soft hint the way a sentence in the system prompt would. That's why this bug is slow to surface: most outputs satisfy the pattern anyway, because the model is generally trying to. The failures cluster in exactly the cases a hint is weakest for — edge-of-distribution inputs, adversarial users, long sessions where earlier context has diluted the instruction.

## Probe it before you trust it, per provider and per version

Don't infer support from docs prose; it drifts across model versions faster than docs get updated. Send a prompt deliberately engineered to produce a schema-violating value and check whether the response ever contains one:

```python
def probe_constraint_enforcement(schema: dict, adversarial_prompt: str, n=20) -> float:
    violations = 0
    for _ in range(n):
        result = structured_call(schema, adversarial_prompt)
        if not matches_pattern(result["order_id"], schema["properties"]["order_id"]["pattern"]):
            violations += 1
    return violations / n  # > 0 means the keyword isn't actually compiled
```

Run this once per constrained field when you adopt a new model or provider, not just once at launch.

## The fix is the one you already use for business rules

Treat `pattern`, `format`, `minLength`/`maxLength`, and numeric ranges the same as a row-limit or a restricted-table check: validate them in code at the tool boundary, return a structured error on failure, and let the model retry. The schema still earns its place as documentation and as a soft prior — just stop expecting the compiler to do the enforcing for keywords it was never able to compile in the first place.
