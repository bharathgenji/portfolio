---
title: "Don't Ask the Model How Confident It Is — Read the Logprobs"
date: "2026-08-20"
summary: "A 'confidence: 0.95' field in your schema is the model's opinion of itself; the logprobs behind that field are the only number that isn't grading its own homework."
tags: ["agents", "reliability", "evaluation"]
status: published
author: "Bharath"
---

## The field that always says 0.9

Add a `confidence` field to your extraction schema and watch what happens: it clusters at 0.85–0.95 regardless of whether the answer is right. Ask a model how sure it is, and you get a second generation conditioned on having just produced the first one — it's not measuring uncertainty, it's justifying an answer it already committed to. That's the same self-grading problem as letting a model judge its own output ([[dont-let-the-model-grade-its-own-homework]]), just wearing a numeric costume instead of a verdict.

The number you actually want already exists and costs nothing extra: the log-probability the model assigned to the tokens it emitted. It's computed during generation whether you ask for it or not — most APIs just don't return it unless you request it.

## Reading it at the field you care about

Turn on `logprobs` and pull the per-token probability for the span that matters — an extracted `total_amount`, a classification label, the argument to a tool call — rather than averaging over the whole response. A model can be highly confident about nine tokens of boilerplate JSON structure and shaky about the one number embedded in it; averaging washes that signal out.

```python
response = llm(
    model=MODEL,
    messages=messages,
    tools=[extract_invoice_tool],
    logprobs=True,
    top_logprobs=3,
)

tool_call = response.tool_calls[0]
arg_tokens = tokens_for_span(response, tool_call.arguments, field="total_amount")
min_prob = min(math.exp(t.logprob) for t in arg_tokens)

if min_prob < 0.7:
    route_to_human_review(tool_call)
```

Take the minimum, not the mean, across the field's tokens. One low-probability token inside a numeric span — the model hedging between "1,250" and "1,205" — is exactly the failure you're trying to catch, and an average buries it under the high-confidence tokens on either side.

## What low logprobs actually tell you

A low-probability token doesn't mean the model is wrong. It means the input was genuinely ambiguous at that point — the source document was smudged, the field had two plausible readings, the schema didn't cover the case in front of it. That's a different and more useful signal than "wrong": it tells you *where* to spend human review budget, not just that some fraction of outputs need it. Route the bottom percentile of confidence scores to a queue and you've built targeted review without a second model call or a hand-written rubric.

## Where this breaks down

Logprobs reflect confidence in the *token*, not confidence in the *fact*. A model can be perfectly calibrated on "the word that comes next is plausible" while being fluently, fluidly wrong about the underlying claim — this catches extraction ambiguity, not hallucinated facts the model states with total token-level certainty. It's also provider-dependent: not every API exposes logprobs for tool-call arguments specifically, only for the full completion, so check before you architect around per-field granularity. And it doesn't replace a judge call for high-stakes actions ([[judge-before-acting]]) — it's a cheap pre-filter that decides which fraction of traffic is worth a judge's attention in the first place.

## The tell

If your review queue is a random 5% sample of production traffic, you're spending it on cases indistinguishable from the 95% you didn't check. If it's the bottom 5% by min-token logprob on the field you care about, you're spending it on the cases actually worth a human's time — for the cost of a request parameter you were already paying for.
