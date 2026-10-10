---
title: "A Shared Cache Key Doesn't Know Which Tenant Asked"
date: "2026-10-10"
summary: "A homegrown answer cache that keys on question text alone will cheerfully serve one customer's grounded answer to another customer who happened to phrase the same question the same way."
tags: ["agents", "caching", "security"]
status: draft
author: "Bharath"
---

## The repeated question that answered for the wrong customer

A multi-tenant support agent noticed something obvious in its logs: dozens of customers asking near-identical questions — "how do I export my data," "how do I reset two-factor auth." Someone added an app-level cache in front of the agent: normalize the question, hash it, store the agent's final answer, and skip retrieval and reasoning entirely on a hit. Cost dropped by a third. Then a support ticket came in — a customer's answer referenced an integration name that wasn't theirs.

The cache key was `hash(normalize(question))`. Two tenants asked the same normalized question. The first tenant's retrieved context included a custom integration specific to their account, and the agent's answer named it. The second tenant's identical question text hit that cached entry and got an answer grounded in someone else's data. Nothing errored. The cache did exactly what it was built to do — it just wasn't built to know that "same question" and "same answer" aren't the same claim once two different tenants are asking.

## Why provider-side caching mostly dodges this and app-level caching doesn't

Provider prompt caching — the kind you set up with a `cache_control` breakpoint — is addressed by the actual byte content of the prefix, scoped to your API key. If tenant-specific data sits before the breakpoint, the bytes differ, so there's simply no cross-tenant hit; you lose the savings on that segment, not correctness. The risk lives in whatever cache you build on top of the model call: a plan cache, a retrieval cache, an answer cache. Any of these will feel safe because "the input was the same" reads like sufficient identity. It isn't, the moment two callers can legitimately deserve different correct answers to text that normalizes the same way.

## Put the tenant in the key, not in a filter after the lookup

```python
def cache_key(tenant_id: str, normalized_question: str) -> str:
    return f"{tenant_id}:{hashlib.sha256(normalized_question.encode()).hexdigest()}"
```

The fix isn't fetching by question hash and then checking `if entry.tenant_id == tenant_id` before returning it — that's a permission check bolted onto a query that already ran, and it's one missed code path away from being skipped. Fold tenant identity into the key itself, so an entry from another tenant is structurally impossible to retrieve, not merely supposed to be discarded.

## The question to ask of every cache in the pipeline

Any cache between the request and the model asserts, implicitly, that its value is valid independent of who's asking. That's true for generic boilerplate. It's false wherever tenant identity changes what's correct — custom instructions, scoped retrieval, permissioned data. Walk every cache in your agent — prompt cache, retrieval cache, tool-result cache, answer cache — and check whether its key includes everything that could legitimately change the right answer. If two different callers could hit the same key and correctly deserve two different responses, the key is under-specified.

## Test it, don't review it

Write one adversarial eval: two synthetic tenants, identical question text, deliberately different scoped context such that the correct answer must differ. Run it against the cache. If tenant two gets tenant one's answer verbatim, the key is missing a dimension. Rerun this check every time someone adds a new memoization layer "to save cost" — that's exactly when nobody re-derives what identity means for the new cache.
