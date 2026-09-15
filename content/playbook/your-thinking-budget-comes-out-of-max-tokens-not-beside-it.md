---
title: "Your Thinking Budget Comes Out of Max Tokens, Not Beside It"
date: "2026-09-15"
summary: "Set budget_tokens close to max_tokens on an extended-thinking call and the model can reason perfectly, then have almost nothing left to write the answer with."
tags: ["agents", "reliability", "cost"]
status: draft
author: "Bharath"
---

## The call that reasons well and answers badly

A team turns on extended thinking for a hard multi-step tool-use task, sets `thinking.budget_tokens` to something generous — 8000 — and leaves `max_tokens` at whatever it was before, say 8192. The model thinks carefully, works through the problem, and then the visible answer comes back as a single truncated sentence, or a tool call with an argument that stops mid-string. Nothing errored. `stop_reason` reads `max_tokens`. The reasoning wasn't the problem — there was simply no token budget left to spend on the output once thinking was done with it.

## Two knobs, one pool

`budget_tokens` isn't a separate allowance that runs alongside `max_tokens` — it's a soft target carved out of the same ceiling. The API requires `max_tokens` to exceed `budget_tokens`, and it'll reject the request if it doesn't, but "exceeds" can mean by 200 tokens, which is a rule the validator is happy with and a budget that's still going to truncate your answer the moment the task needs more than a one-line response. The model can also legitimately use fewer thinking tokens than the budget on an easy turn, or run right up against it on a hard one — you don't get to assume the split is 8000/192 vs. actually landing somewhere else entirely. What you can guarantee is the ceiling: thinking output plus visible output plus every tool call in that turn cannot exceed `max_tokens`, full stop.

This is the same failure mode as a plain truncated response ([[max-tokens-is-a-ceiling-on-the-answer-not-just-the-bill]]), but it's sneakier here because a run can look successful for weeks — most tasks don't need the full thinking budget, so there's headroom by accident — until one genuinely hard input burns the whole reasoning allowance and takes the answer down with it.

## Size the ceiling off the answer, not the thinking

Pick `budget_tokens` for the reasoning the task needs, then add real headroom on top for `max_tokens` — sized off your largest legitimate output, the same way you'd size it without thinking involved:

```python
THINKING_BUDGET = 8000
LARGEST_EXPECTED_ANSWER = 4000  # biggest tool call / response this task produces

response = client.messages.create(
    model=model,
    max_tokens=THINKING_BUDGET + LARGEST_EXPECTED_ANSWER,
    thinking={"type": "enabled", "budget_tokens": THINKING_BUDGET},
    messages=messages,
)

if response.stop_reason == "max_tokens":
    raise TruncatedResponseError("thinking + answer exceeded max_tokens — raise the ceiling")
```

Don't back into `max_tokens` by adding a token or two to whatever `budget_tokens` happens to be — that satisfies the API's validation, not your task's actual output needs.

## The rule

`budget_tokens` is a request to the model about how much room to reason in, not a reservation the API carves out for you. The two numbers share one wallet. Check `stop_reason` on every extended-thinking call the same way you would without thinking enabled — the failure looks identical from the outside, it's just harder to trigger in testing because it only shows up once reasoning gets expensive.
