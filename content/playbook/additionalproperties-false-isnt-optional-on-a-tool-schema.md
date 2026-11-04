---
title: "additionalProperties: false Isn't Optional on a Tool Schema"
date: "2026-11-04"
summary: "JSON Schema lets unknown fields through by default — leave that default in place on a tool's input schema and the model's hallucinated fields sail past validation into your database call."
tags: ["agents", "security", "tools"]
status: draft
author: "Bharath"
---

A team had an `update_user` tool: `name`, `email`, both strings, both optional, nothing else defined. The handler took the validated args and called `db.update(user_id, **args)` — convenient, since the schema was supposed to be the whole contract. One day a support agent, mid-conversation about a locked-out admin account, called `update_user` with `{"name": "Alex", "role": "admin"}`. `role` wasn't in the schema. The call validated anyway, and `**args` happily passed it straight through to a column that absolutely should not be user-writable from a chat transcript.

Nobody had defined a `role` field. Nobody had to. JSON Schema's `additionalProperties` defaults to `true` — a schema with `properties` listing exactly two fields still accepts a hundred more. The model didn't exploit a bug in your validator. It did exactly what an unconstrained schema permits, and the schema was unconstrained because nobody set the one keyword that says otherwise.

## Why this is easy to ship

`properties: {name, email}` *reads* like an exhaustive list. Every schema tutorial starts there, and most hand-rolled schemas stop there too, because the happy path never produces extra fields — your own code only ever calls the tool with the fields you intended. The gap only shows up when the caller isn't your code. A model with the right context, a leading instruction, or a prompt-injected suggestion from a tool result upstream will emit a field that fits the conversation even though it was never offered one. Schema validation reports success in both cases, because both are schema-valid. The difference between "the two fields I meant" and "the two fields plus whatever else fit" is a single boolean nobody set.

## Set it explicitly, everywhere

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string" }
  },
  "additionalProperties": false
}
```

With that line in place, the `role` call fails schema validation before it ever reaches your handler, and comes back as a structured error the model can read and correct — the same pattern as [[return-errors-to-your-agent-dont-throw-them]]. Without it, the call succeeds and the field rides along into whatever `**kwargs`-style handler trusted the schema to have been the full contract.

## Don't stop at the top level

Nested objects need the same keyword at every level — `additionalProperties: false` on the outer object doesn't propagate into a nested `address` or `metadata` object; each one defaults to permissive on its own. If a tool's schema was generated from a Pydantic model, a dataclass, or an ORM model, check what the generator actually emits — several stop at the top level by default, and the fields you're least likely to have reviewed are the ones several levels deep.

## Audit for this directly

Grep every tool schema in your codebase for `additionalProperties`. Anywhere it's absent on an object with `properties` defined, you have a schema that looks closed and isn't. That gap costs nothing until the day a handler trusts the schema to be the whole contract and passes validated args straight into something privileged — at which point the fix is one keyword, and the incident report is not.
