---
title: "A Reranker That Wins on NDCG Can Still Lose on Task Success"
date: "2026-10-17"
summary: "The cross-encoder bumped retrieval relevance by fifteen points and quietly dropped the agent's actual task success rate — because those two numbers were never measuring the same thing."
tags: ["agents", "rag", "evals"]
status: draft
author: "Bharath"
---

## The upgrade that looked like a win

A team bolted a cross-encoder reranker onto their retrieval pipeline: embed top-50 candidates, rerank with the cross-encoder, keep the top 8 for context. Offline, against a labeled set of query-chunk relevance judgments, NDCG@10 jumped from 0.71 to 0.86. Clear win, shipped it.

Two weeks later, the end-to-end agent eval — the one that scores whether the agent actually answered the user's question correctly — had dropped three points. Nobody connected the two events for a while, because nobody had run that eval against the reranker change before shipping it. The retrieval metric and the agent's success metric had quietly diverged, and only one of them got checked.

## Why a better reranker can produce a worse agent

NDCG and MRR score how well a ranker orders chunks against *human relevance judgments on isolated query-chunk pairs*. That's a real signal, but it answers a narrower question than the one your agent is actually asking. An agent doing comparison, calculation, or multi-fact synthesis doesn't need the single most relevant chunk — it needs a *set* of chunks that together support the answer.

Cross-encoders tend to collapse near-duplicate-looking content toward one representative, because from a pairwise relevance standpoint, two chunks that both discuss "Q3 revenue" look redundant. But if one of them has this quarter's number and the other has last quarter's — the exact comparison the user asked for — the reranker just picked the more "relevant" one and threw away the half of the answer that made it correct. The eval set that produced your 0.86 NDCG never tested for that, because relevance judgments are collected per pair, not per task.

Latency compounds the problem in agent loops specifically. A chat endpoint pays the reranker's cost once. An agent that calls retrieval three or four times across a multi-step task pays it three or four times, and cross-encoder scoring doesn't parallelize as cheaply as a vector lookup — that per-call tax shows up in your p50 long before anyone notices it in a retrieval benchmark.

## Gate on the eval that matches the failure mode

Don't let a retrieval metric authorize a ship decision by itself. Run the same end-to-end task-success eval you already use for the agent, with the reranker as the only variable:

```python
def compare_reranker(eval_set, agent_fn):
    baseline = [agent_fn(q, rerank=False) for q in eval_set]
    treatment = [agent_fn(q, rerank=True) for q in eval_set]
    return {
        "task_success_baseline": score(baseline, eval_set),
        "task_success_treatment": score(treatment, eval_set),
        "ndcg_delta": ndcg(treatment) - ndcg(baseline),
    }
```

If `ndcg_delta` is positive and `task_success` moves the other way, you've found a real divergence, not noise — and it's cheap to catch before production, expensive to catch after.

## If you need breadth, don't let the reranker prune it

When your task genuinely requires multiple corroborating facts, use the reranker to order a generously-sized candidate pool rather than to cut it down to a handful. Decide "how many chunks enter context" with a rule that accounts for task shape — comparison and synthesis tasks need more slots than lookup tasks — and let the reranker do what it's actually good at: ordering, not deciding what gets left out.
