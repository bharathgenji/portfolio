---
title: "Max Tokens Is a Ceiling on the Answer, Not Just the Bill"
date: "2026-09-10"
summary: "Teams cap max_tokens to control cost, then watch agents emit tool calls that stop mid-argument — because a truncated response and an incomplete one look identical until you check the stop reason."
tags: ["agents", "reliability", "cost"]
status: draft
author: "Bharath"
---

## The tool call that stops mid-string

An agent writes a file via an `edit_file` tool. Most calls work. Occasionally the edit lands with a truncated `new_content` field — valid JSON, valid schema, just missing the last third of the file. Nobody set out to write a bug here. The team had set `max_tokens: 1024` on every call months earlier, back when responses were short, as a cost guardrail. Nine months and several feature additions later, the model's replies routinely need more than that — a longer explanation, a bigger diff — and the API does exactly what it was told: stops generating at token 1024, mid-string, and returns normally.

That's the trap. A response cut off by `max_tokens` isn't an error. The API returns `stop_reason: "max_tokens"` and a 200. If nothing reads that field, the response looks identical to a clean completion: valid envelope, a `content` array, a tool call that parses as JSON right up until the value it was building got cut off mid-character. [[dont-execute-a-tool-call-until-its-json-is-complete]] covers the streaming version of this — a fragment that hasn't finished arriving yet. This is the same wound from a different angle: the fragment has *stopped* arriving, permanently, and nothing about the shape of the data tells you which case you're in.

## Check the stop reason before you trust the content

This is a five-line fix that most teams skip because it never fires in testing — test prompts are short, real traffic drifts long.

```python
response = client.messages.create(model=model, max_tokens=max_tokens, messages=messages)

if response.stop_reason == "max_tokens":
    raise TruncatedResponseError(
        f"response cut at {max_tokens} tokens — raise the cap or shorten the prompt"
    )
```

Treat `max_tokens` truncation as a hard failure, not a size to shrug at. A truncated tool call executed anyway is worse than a request that errors cleanly, because the failure surfaces downstream — a half-written file, a partial refund amount, a `search` query missing its closing filter — at a point in the pipeline that has no idea a token budget upstream is the actual cause.

## Size the cap to the output, not the vibe

`max_tokens` isn't a knob you set once from a gut feeling about typical response length. Set it from the largest legitimate output your task can produce — the biggest file your `edit_file` tool writes, the longest structured report your agent generates — with headroom, not the median. If that number is inconveniently large for cost reasons, that's real signal: either the task needs a bigger budget or the tool's output shape needs to shrink (return a diff instead of a full file rewrite, for instance), not a silent hope that most calls stay under the wire.

And remember the number competes with your input for the same context window — a huge prompt with a huge `max_tokens` on top of it can exceed the model's context limit before generation even starts, which is a different, louder failure than truncation. Both ends of that budget deserve a number you picked, not one you inherited.

## The rule

`stop_reason` is the field that tells you whether you got the whole answer or just as much as you paid for. Log it, alert on `max_tokens`, and never let a cost guardrail silently downgrade into a correctness bug three quarters after you set it.
