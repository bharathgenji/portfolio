---
title: "An LLM Judge Picks the First Option More Than the Better One"
date: "2026-09-14"
summary: "Swap the order of A and B in a pairwise eval prompt and a meaningful share of your judge's verdicts flip — the judge is voting on position, not quality."
tags: ["agents", "evals", "reliability"]
status: draft
author: "Bharath"
---

## The tell

You're using an LLM judge to pick a winner between two candidate outputs — old prompt vs. new prompt, model A vs. model B, this agent trajectory vs. that one. The judge comes back decisive: 71% prefer the new version. You ship it. Someone later runs the exact same eval with the two candidates swapped in the prompt — B listed first instead of A — and the number moves to 54%. Nothing about the outputs changed. Only their position in the prompt did.

This is position bias, and it's well documented in every pairwise LLM-judge study anyone has bothered to run: judges systematically favor whichever answer appears first (sometimes second, depending on model and prompt format, but it's rarely 50/50). The effect size varies by model and task, but "somewhat" is the wrong mental model — on ambiguous or closely-matched pairs, position alone can flip a third or more of verdicts. A judge that seems to have a strong, stable opinion may just have a strong, stable opinion about slot order.

## Why it happens

The judge is doing next-token prediction over a prompt that happens to contain two candidates in a sequence. Autoregressive models have a documented bias toward earlier context — it's the same mechanism behind [[the-middle-of-your-context-window-is-where-rules-go-to-die]], showing up in a two-item list instead of a long one. There's no rubric-violation here, no bug to patch. It's a structural property of how the model attends to its input, and it survives prompt-engineering fixes like "be fair to both options" because the model isn't being unfair on purpose — it doesn't have visibility into the bias to correct for it.

## The fix is symmetry, not a better prompt

Run every pairwise comparison twice, with the candidates in both orders, and only trust a verdict where both runs agree:

```python
def judge_pair(a: str, b: str, rubric: str) -> str:
    v1 = llm_judge(first=a, second=b, rubric=rubric)   # "first" or "second"
    v2 = llm_judge(first=b, second=a, rubric=rubric)

    winner_v1 = a if v1 == "first" else b
    winner_v2 = b if v2 == "first" else a

    if winner_v1 == winner_v2:
        return winner_v1
    return "tie"  # position-sensitive — don't force a verdict
```

Doubling the judge calls is the cost. What you get back is a "tie" bucket instead of a false decisive result, which is strictly more honest — a pair the judge can't rank consistently across orderings isn't a pair with a real winner, it's a pair the judge is guessing on. Report that tie rate alongside your win rate; a high tie rate on a specific eval slice tells you the judge can't discriminate on that slice at all, which is a finding, not noise to average away.

## Where this compounds

If you're already batching judge calls for cost (see [[batch-your-latency-insensitive-agent-calls]]), the order-swap pass is nearly free — it's just N more independent requests in the same batch, not a synchronous round trip. And if your pipeline runs the judge more than once per pair for other reasons — self-consistency voting, multiple rubric dimensions — make sure position is randomized or swapped across those runs too. Averaging three votes that all saw the same ordering isn't three independent checks; it's one biased check counted three times.
