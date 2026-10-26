---
title: "A message_delta's Usage Field Is a Total, Not a Delta"
date: "2026-10-26"
summary: "A cost dashboard that sums every streaming usage event instead of reading the last one reports output tokens that don't exist."
tags: ["agents", "cost", "streaming"]
status: draft
author: "Bharath"
---

## The dashboard that doubled everyone's output tokens

A team instrumenting per-request cost on a streamed agent loop wrote the obvious-looking code: accumulate `usage.output_tokens` from every SSE event as it arrives, add it to a running total, bill the difference. Within a day their per-request cost numbers were running high — not wildly, but consistently, by roughly the size of the first few output tokens of every response. Nobody had touched pricing. The bug was in what "delta" means in `message_delta`.

## What the event stream actually sends

A streamed Messages response looks like this, trimmed to the usage-bearing events:

```
event: message_start
data: {"type":"message_start","message":{...,"usage":{"input_tokens":25,"output_tokens":1}}}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":15}}

event: message_stop
data: {"type":"message_stop"}
```

`message_start.usage.output_tokens` isn't zero and isn't real — it's a small placeholder (often `1`) because the response object has to report *some* value before any output exists. `message_delta.usage.output_tokens` is not the count of tokens generated since the last event; it's the running total for the whole turn, re-sent as the only number that matters, right before `message_stop`. There is exactly one `message_delta` per non-tool-use turn in the common case, so "delta" here describes what changed about the *message* (its `stop_reason`, its final token count) — not an increment you add to something else.

Code that does `total += event.usage.output_tokens` across every event double-counts: it picks up the placeholder `1` from `message_start`, then adds the real total of `15` on top, and reports `16` output tokens for a 15-token response. Multiply that by request volume and it looks like noise in a chart, not a bug — until someone reconciles against the provider's own billing export and the numbers don't match.

## The fix

Don't accumulate. Read `input_tokens` once from `message_start` (it's final and correct there, including `cache_creation_input_tokens` and `cache_read_input_tokens`), and read `output_tokens` once from the last `message_delta` you see before `message_stop`:

```python
input_tokens = None
output_tokens = None

for event in stream:
    if event.type == "message_start":
        input_tokens = event.message.usage.input_tokens
    elif event.type == "message_delta":
        output_tokens = event.usage.output_tokens  # overwrite, never add
```

If your loop runs multiple turns (tool calls, `pause_turn` continuations), each turn gets its own `message_start`/`message_delta` pair — sum *across turns*, never within one.

## The rule

Streaming usage fields are named after when they arrive, not how they combine. Before wiring any event field into a cost or token-budget calculation, check whether the provider's docs call it cumulative or incremental — don't infer it from the event name. `delta` in an event type is not a promise about the shape of every field inside it.
