---
title: "A Production Eval Set Is a Second Copy of Your Compliance Problem"
date: "2026-11-17"
summary: "Sampling real conversations into an eval fixture doesn't just copy the data — it copies the retention clock, the access list, and the DPA that came with it, and most eval pipelines honor none of them."
tags: ["agents", "evals", "data-governance"]
status: draft
author: "Bharath"
---

## The eval set that outlived the data it came from

A support agent team pulled 400 real customer conversations into a JSON fixture to build their first eval suite — the obvious move, since synthetic cases weren't catching the failures production was hitting. The fixture lived in the eval repo for a year. It got checked out by every contractor who touched the agent, attached as context to an LLM-judge prompt sent to a third-party eval vendor, and copied into three different experiment branches because that's how experiment branches work. Eighteen months later, a customer exercised a data-deletion request. Support deleted the conversation from the production database, closed the ticket, and had no idea it was still sitting — verbatim, with the customer's name and account details — in a fixture file nobody had thought to search.

This isn't a hypothetical edge case; it's the default outcome of how eval sets get built. The data didn't leak through a vulnerability. It leaked through a workflow nobody designed to carry the original constraints forward.

## The copy doesn't inherit the controls, only the content

Production conversational data usually sits behind a retention policy, an access tier, and — if you serve regulated customers — a data processing agreement that specifies who's allowed to touch it and for how long. When you sample that data into an eval fixture, you get the content. You do not automatically get the retention clock (fixtures don't expire), the access tier (anyone with repo access now has conversation-level PII), or the DPA scope (your eval vendor almost certainly isn't a party to the agreement that covered the original storage).

The third-party LLM-judge case is the sharpest version of this: sending a production conversation to an external model-as-judge is a new data processing event. If your contract with that customer doesn't cover disclosure to that specific sub-processor, you've created a compliance gap that exists only because you were trying to measure accuracy.

## Tag provenance at extraction, not cleanup

Fix this at the point data leaves the production boundary, not by auditing fixtures after the fact.

```python
def sample_for_eval(conversation: dict) -> dict:
    return {
        "input": redact_pii(conversation["transcript"]),
        "expected": conversation["resolution"],
        "source_id": conversation["id"],       # for deletion propagation
        "retention_until": conversation["created_at"] + RETENTION_WINDOW,
        "judge_eligible": conversation["customer_dpa_allows_subprocessors"],
    }
```

Three things do the work: redaction before the record leaves prod, a `source_id` so a deletion request can be grepped out of every fixture derived from it, and a `judge_eligible` flag so conversations without sub-processor coverage never reach a third-party judge — they get scored in-house instead, even if that means a smaller judged subset.

## The rule

An eval set built from production data is still production data, just in a location that wasn't built to enforce the rules the original location had. Apply the same retention window, the same access tier, and the same sub-processor restrictions to the fixture that applied to the source — or redact hard enough at extraction that the fixture genuinely isn't production data anymore. Picking neither is the default, and it's the one option that turns your eval suite into the next incident report.
