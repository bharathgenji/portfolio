---
title: "A Dynamic JSON Schema Recompiles on Every Call"
date: "2026-10-18"
summary: "Strict structured-output mode caches the grammar it builds from your schema — interpolate anything into that schema per request and you pay full compilation latency on every single call, forever."
tags: ["agents", "structured-output", "latency"]
status: draft
author: "Bharath"
---

## The endpoint that got slower with more data

A team built a per-tenant extraction agent: each tenant defines a set of custom fields they want pulled out of their documents, so the service builds the output schema at request time — one `enum` listing that tenant's valid category values, one `properties` block matching their field names. Strict structured-output mode, so the output is guaranteed to validate. It worked fine in testing with three tenants. In production with four hundred, p50 latency on the extraction call was triple what the same prompt took in a different endpoint using a fixed schema. Nothing about the model, the prompt, or the input size had changed. The schema had.

## Strict mode compiles your schema into a grammar — and caches the grammar, not your request

When you turn on strict structured-output mode, the provider doesn't just validate your JSON schema at the end — it compiles it into a constrained decoding grammar that masks invalid tokens at every generation step. That compilation step has real cost, and providers cache the compiled grammar so repeat calls with the *identical* schema skip it. OpenAI documents this directly: the first request with a new schema pays extra latency for compilation, and it's cached thereafter — "thereafter" meaning for that exact schema, byte for byte.

The tenant service never hit that cache. Every tenant has a different `enum` list, so every tenant's schema is a different cache key. Four hundred tenants means four hundred first-requests, forever, because nothing ever repeats the exact schema a second time if the tenant's category list changes even once. The team had built a system that pays the cold-start compilation tax on the hot path, permanently, and it looked identical to "this model is just slow" from the outside.

## Separate what varies from what's structural

The fix isn't abandoning strict mode — it's keeping the schema's *shape* fixed and pushing the variable part into the content instead of the contract:

```python
# Before: schema shape changes per tenant — never cached
schema = {
    "type": "object",
    "properties": {"category": {"enum": tenant.categories}},
}

# After: fixed shape, tenant's valid values passed as context, validated after
schema = {
    "type": "object",
    "properties": {"category": {"type": "string"}},
}
prompt = f"Valid categories for this tenant: {tenant.categories}. ..."
# then validate category is actually in tenant.categories before trusting it
```

You trade compile-time enforcement for a one-line runtime check, and you get the cache back. For the cases where you genuinely need the enum enforced in-schema — not every tenant's category list is safe to leave unvalidated — bucket tenants by schema shape and cap how many distinct compiled schemas you maintain, instead of letting the cache key be "every tenant, unbounded."

## Check for this before blaming the model

If a structured-output endpoint's latency doesn't match its load — slow regardless of traffic, slow even on tiny inputs — log the actual schema bytes sent per call and diff them across requests. A schema that's byte-identical across every call to the same logical endpoint gets the cache. A schema with a timestamp, a tenant ID, or a dynamically-sized enum baked into it never will, and no amount of prompt tuning or model swapping will fix a cache-key problem.
