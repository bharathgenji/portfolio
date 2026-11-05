---
title: "A Prefilled Assistant Turn Doesn't Survive Extended Thinking"
date: "2026-11-05"
summary: "The oldest trick for forcing clean JSON out of a chat model — seeding the assistant turn with a `{` — silently stops being an option the moment you turn on extended thinking."
tags: ["agents", "api", "structured-output"]
status: draft
author: "Bharath"
---

A team had a classifier call that skipped the "Sure, I can help with that" preamble by prefilling the assistant turn: send the request with the last message in the `messages` array set to `role: assistant, content: "{"`, and the model continues from there instead of starting fresh. It's a cheap, reliable way to force JSON-only output without a tool call. It had worked for months.

Then a batch of harder cases started coming through — ambiguous categories where the model needed to actually reason before committing to a label — so they turned on extended thinking for that call to get better accuracy on the hard tail. The request started failing with a 400. Nothing about the schema or the messages had changed. The prefill was the problem.

## Why the prefill has to go

Extended thinking isn't an optional preamble the model can skip when something's already been written for it — the API requires the assistant turn to *start* with a thinking block (or a `redacted_thinking` block, if the content was flagged) whenever thinking is enabled. A prefilled assistant message asserts "the turn already started, and it started with this text." Those two requirements can't both be true, so the provider rejects the request outright rather than silently dropping the thinking step or the prefill. You find out at call time, not at review time, and usually in production the first time a hard case routes through the thinking-enabled path.

## What actually breaks

Any pattern built on prefill stops working the instant thinking turns on for that call:

```python
# Works with thinking off. Raises an error the moment
# "thinking" is added to the same request.
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": prompt},
        {"role": "assistant", "content": "{"},  # prefill
    ],
)
```

That includes the "force JSON by seeding `{`" trick, "skip the refusal preamble by seeding an agreeable opener" tricks, and any multi-turn setup where you inject a partial assistant response to steer continuation.

## What to do instead

Don't fight the constraint — route around it. Use a tool call with a strict input schema to get structured output; the model's forced to emit valid arguments against your schema regardless of whether thinking is on, and tool calls are explicitly compatible with thinking (as long as `tool_choice` stays `auto` — forcing a specific tool is its own incompatibility, a separate gotcha from this one). If you don't want a tool call, parse the answer out from after the thinking block instead of trying to seed it — the model still ends its turn with ordinary content once it's done reasoning.

Treat "does this call use extended thinking" as a per-call branch in whatever code builds your message list, not a global flag. The same agent legitimately wants thinking off for easy, prefill-friendly calls and on for the hard tail — which means your request builder needs to know, per call, that one path is allowed to prefill and the other path isn't allowed to even try.
