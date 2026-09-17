---
title: "A Token Estimate Isn't a Token Count"
date: "2026-09-17"
summary: "Chars-divided-by-four is close enough for a dashboard and wrong enough to blow your context budget the moment a tool schema or an image enters the request."
tags: ["agents", "cost", "context-management"]
status: draft
author: "Bharath"
---

## The chunker that "fit"

A pipeline splits documents into chunks sized to fit comfortably under a context limit, using the oldest trick in the book: count characters, divide by four, call that tokens. It works fine for months, because most requests in testing are plain prose and the heuristic is close enough for prose. Then someone adds tool use, or starts attaching page images, or the corpus picks up a batch of dense JSON and non-English text, and the same chunker that "fit" 190K estimated tokens into a 200K window starts producing requests that come back with a context-length error — or worse, a chunk boundary that lands mid-sentence because the estimate that decided where to cut was wrong in the same direction it was wrong about the total.

The heuristic isn't broken, it's just answering a different question than the one you're asking it. Chars-divided-by-four approximates *English prose*. It has no model of how a BPE tokenizer actually segments text, and it has zero model of the things that don't have "characters" at all: an image's token cost is a function of pixel dimensions, not a caption you could count; a tool's JSON schema costs tokens for every key, brace, and enum value in a way that reads nothing like the tool's plain-English description; cached blocks and thinking output add tokens that never appear in what you'd show a user. Each of those diverges from the heuristic in a different direction, and they all diverge hardest exactly on the requests where getting the number right matters most — the big ones, near the limit.

## Ask the API, don't guess at it

Anthropic's `count_tokens` endpoint takes the exact request shape you're about to send — same `system`, same `messages`, same `tools` — and returns the real number the model will be billed and constrained by, without generating a completion:

```python
count = client.messages.count_tokens(
    model=model,
    system=system_prompt,
    messages=messages,
    tools=tools,
)
if count.input_tokens > budget:
    messages = drop_oldest_turns(messages, count.input_tokens - budget)
```

It's a separate call, so it costs a round trip — cheap relative to guessing wrong on a request that either fails outright or silently truncates at the wrong boundary. Call it at the point where you're about to make a decision that depends on the number: whether a batch fits, where to cut a chunk, whether to compact context this turn ([[compact-agent-context-mid-run]]). Don't call it on every turn of a hot loop where a stale-by-one-message estimate is fine.

## Where the heuristic is still fine

Dashboards, rough cost projections, log lines nobody's making a decision from — a 10% error there costs nothing. The line is whether anything downstream *enforces a limit* against the number. If a limit is enforced, the number needs to come from the same tokenizer that enforces it, not from an approximation of it that was tuned on different content than the request you're actually about to send.
