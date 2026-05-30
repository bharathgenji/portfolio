---
title: "Stop parsing model text. Use structured output."
date: "2026-05-26"
summary: "If you're regexing fields out of an LLM's prose, you've built a bug factory. Constrain the output to a schema and delete half your code."
tags: ["agents", "tool-calling", "patterns"]
status: published
author: "Bharath"
---

Here's a pattern I see constantly: someone asks the model to "return the invoice number, date, and total," gets back a friendly paragraph, and then writes a small mountain of regex to dig the values out. It works in the demo. It breaks the moment the model says "The total is **$1,250**" instead of "Total: 1250".

You don't need the regex. You need a **schema**.

## Constrain the output, don't parse it

Every serious model API now supports structured output — a JSON schema the response is *guaranteed* to conform to. Define the shape once:

```ts
const schema = {
  type: "object",
  properties: {
    invoiceNumber: { type: "string" },
    date: { type: "string" },
    total: { type: "number" },
    confidence: { type: "number" },
  },
  required: ["invoiceNumber", "date", "total"],
};
```

Now the model returns valid, typed JSON every time. No parsing, no "what if it phrases it differently," no silent failures. The same idea powers **tool calling**: when an agent "calls a tool," it's really just emitting a structured object that matches the tool's parameter schema. Master one and you've mastered both.

## What this buys you

- **Validation for free.** The shape is checked at the boundary. Malformed output becomes a retry, not a 2am pager.
- **Less code.** I've deleted entire parsing modules by moving the contract into a schema. Fewer lines, fewer bugs.
- **Composability.** Structured output from one agent is structured *input* to the next. That's what makes multi-agent pipelines actually hold together instead of degrading into a game of telephone.

## One gotcha: thinking models eat your token budget

A real trap I hit recently: newer "thinking" models reason *inside* the output budget. If you cap `maxOutputTokens` too low, the model spends it all thinking and never emits the JSON — you get an empty response and a confusing error. Either raise the ceiling or disable thinking for pure extraction tasks. Structured output is only reliable if the model has room to actually produce it.

The rule of thumb: **the boundary between your code and the model should be a contract, not a conversation.** Define the contract, and let the model fill it in.
