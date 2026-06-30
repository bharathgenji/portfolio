---
title: "Give Every Agent Run a Token Budget"
date: "2026-06-18"
summary: "An agent that doesn't know how much runway it has will use all of it — here's how to fix that."
tags: ["agents", "cost", "reliability"]
status: published
author: "Bharath"
---

An agent that doesn't know how much runway it has will use all of it.

This isn't a model problem — it's an architectural one. Left unconstrained, agents expand work to fill available context: they search more sources, generate more intermediate reasoning, call more tools "just to be sure." The run that should take 8k tokens takes 80k. The API bill for a thousand users is ten times what you projected.

The fix is giving the agent a budget and making it a first-class input.

## What a budget actually is

A token budget is a soft ceiling you pass explicitly to the agent at run time:

```python
BUDGET = 50_000  # tokens for this run

system_prompt = f"""
You are a research assistant. Complete the task using at most {BUDGET} tokens total.
When you have used 80% of your budget, stop gathering new information and synthesize
what you already have. Return partial results rather than failing.
"""
```

The model doesn't actually count tokens in real time — but it reasons about the constraint. "I have limited runway" changes its planning: it prioritizes, skips redundant searches, and stops elaborating. This alone cuts average run length by 30–40% in my experience.

## Enforce it in the orchestrator, not just the prompt

Prompt-level constraints leak. Close the loop in code: track tokens consumed after each model call and cut the run before it blows past the ceiling.

```python
used = 0
limit = 50_000

for step in agent_loop(task):
    used += step.tokens_used
    if used > limit * 0.9:
        return partial_result(step.state)
    if used > limit:
        raise BudgetExceededError(used)
```

Return partial results when you hit 90%; raise at 100%. The 90% threshold gives the agent one last chance to synthesize and exit cleanly rather than getting cut off mid-sentence.

## Calibrate the budget per task type

Not all tasks need the same budget. A simple Q&A that touches one data source shouldn't compete with a multi-source research task. Bucket your task types and assign budgets empirically:

- Quick lookup: 5k tokens
- Single-document analysis: 15k tokens
- Multi-source research: 50k tokens
- Long-running workflow: 150k tokens

Track actual usage in production logs. After a week you'll see exactly where agents overshoot and where they have headroom you're wasting.

## The hidden benefit: better outputs

Agents with a budget produce tighter outputs. When the model knows it can't keep searching, it commits to an answer with what it has. Unconstrained agents hedge: "I'd need more information to be certain, but I can also check X, and potentially Y…" Constrained agents decide.

This is the same dynamic as a one-hour meeting vs. a two-hour one. Constraint creates focus.

Set the budget at the start of every run. Make the agent aware of it. Enforce it in the orchestrator. You'll spend less, predict costs better, and get cleaner answers.
