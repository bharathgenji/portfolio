---
title: "A Required Field Doesn't Leave Room for I Don't Know"
date: "2026-09-06"
summary: "Mark a schema field required and the model will fill it even when the source document doesn't — schema validation can't tell a truthful value from a well-formatted lie."
tags: ["agents", "structured-output", "reliability"]
status: draft
author: "Bharath"
---

## The PO number that didn't exist

An invoice-extraction agent pulls `vendor`, `total`, `invoice_date`, and `po_number` out of scanned PDFs. Most invoices have a purchase order number. Some — one-off vendors, expense reimbursements — don't. On those, the field still comes back populated, in the right format, matching the vendor's usual PO pattern. It's fabricated. Nothing in the pipeline catches it, because [[structured-output-beats-parsing|structured output]] validated cleanly: a string where a string was expected, shaped exactly like every real PO number the model has seen. The bug shipped for months before someone noticed a "PO number" on a reimbursement that has never once had one.

## Required means "produce a token," not "this exists"

Constrained decoding builds a grammar from your schema, and a required property is a mandatory production in that grammar — the object cannot close until every required key has a value of the declared type. There's no branch in that grammar for "the source didn't say." The model isn't choosing to guess; guessing is the only path the grammar allows once you've marked a field required and given it no way to express absence.

This gets worse under strict structured-output modes. OpenAI's strict JSON schema mode requires every property to appear in `required` — you cannot mark a field optional at all, full stop. The only sanctioned way to model "might not be present" is a nullable type. If you skip that step, you haven't made the field optional; you've made fabrication the only way to satisfy the schema.

## Give the model a truthful value to emit

```json
"po_number": {
  "type": ["string", "null"],
  "description": "Purchase order number, only if printed on the invoice. Null if none is shown — do not construct one from other fields."
}
```

`po_number` stays in `required`. What changes is that `null` is now a legal, correct answer, and the description tells the model what null *means* instead of leaving it to infer that absence is even an option. This same pattern applies to `confidence` fields, `next_action` recommendations, anything the source material might simply not contain.

## Schema validation can't grade this — write an eval for it

A generic eval that checks "is the output valid JSON matching the schema" will pass on the fabricated PO number just as happily as on a real one — both are well-typed strings. You need a narrower eval: feed the model documents you've confirmed have no PO number, and assert the field comes back `null`, not populated. This is the same shape as [[freeze-tool-responses-in-evals|freezing a known input and checking a specific, previously-observed failure]] rather than trusting an end-to-end pass/fail.

## Where to look first

Audit format-constrained fields before free-text ones — IDs, dates, phone numbers, SKUs. A fabricated paragraph reads as vague and gets caught in review. A fabricated ID validates its format, matches the pattern of real ones, and gets written straight into a downstream system as fact. For every required field, ask whether the source can legitimately omit it. If it can, make the type nullable, tell the model what null means, and go find the eval case that's currently passing for the wrong reason.
