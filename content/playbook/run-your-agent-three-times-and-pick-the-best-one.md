---
title: "Run Your Agent Three Times and Pick the Best One"
date: "2026-07-13"
summary: "For hard, ambiguous tasks, sampling an agent N times in parallel and voting beats another week of prompt tweaking on a single run."
tags: ["agents", "reliability"]
status: draft
author: "Bharath"
---

## The task that no prompt fixes

Some tasks don't have a prompt that gets them to 95%. Ask an agent to write a non-trivial SQL query against a schema it's only seen the DDL for, or to pick the right one of eleven similar internal tools, or to draft a root-cause summary from a noisy incident timeline, and you'll plateau somewhere in the 70-85% range no matter how much you refine the system prompt. The failures aren't consistent enough to patch with one more rule — this run missed a join condition, that run picked a plausible-but-wrong tool, the next one got both right. That's not a systematic bias you can prompt away. That's variance, and variance has a different fix: sample more than once.

## Self-consistency, not just a retry

Run the same input through the agent N times in parallel — three to five is usually enough — at a nonzero temperature, then reconcile the outputs instead of taking whichever one finished first.

```python
async def best_of_n(task_input: str, n: int = 5) -> str:
    candidates = await asyncio.gather(*[
        run_agent(task_input, temperature=0.7) for _ in range(n)
    ])
    return select_winner(candidates)
```

This only works if the samples actually differ. Running the same prompt five times at `temperature=0` gets you five near-identical outputs and none of the benefit — you're paying 5x for one sample's worth of signal. The diversity has to be real, which is the opposite instinct from the determinism you want elsewhere in an agent loop (see [Keep the Clock and the RNG Out of Your Agent Loop](/playbook/keep-the-clock-and-the-rng-out-of-your-agent-loop) — that post is about replay fidelity; this is about exploiting variance on purpose, at a different stage).

## Choosing `select_winner` for your output shape

For discrete outputs — a tool choice, a classification, a routing decision — majority vote is cheap and works well: tally the candidates and take the mode. Ties break toward the option with the higher average confidence, if your agent reports one.

For open-ended text — a summary, a query, a draft reply — voting on exact strings doesn't work, because five correct answers can be five different strings. Use a judge call instead: a cheap model scores each candidate against a rubric and you keep the top score. This is the same mechanism as [Add a Judge Call Before High-Stakes Agent Actions](/playbook/judge-before-acting), reused as a selector instead of a gate. For SQL specifically, you get a stronger signal for free: execute all N candidates against a read replica and keep the one that runs without error and returns a non-empty, schema-valid result. Execution is a better judge than any model.

## What this costs, and what it doesn't fix

N samples costs roughly N times the tokens of one run — real money at volume. It costs almost no extra latency, because the samples run concurrently (the same `gather` pattern as [Independent tool calls should run in parallel](/playbook/parallel-tool-calls)); you're trading dollars for reliability, not time for reliability.

It doesn't fix bias. If the model is wrong the same way every time — it doesn't know a table exists, it's missing a fact — five samples converge on the same wrong answer, and voting just makes you confident in the wrong thing. Best-of-N is for the failures that look like a coin flip across runs. If your error analysis shows the same mistake in all N samples, you have a prompt or context problem, and no amount of resampling buys you out of it.

Reserve this for the tasks worth the multiplier — the ones where a single wrong answer is expensive and the failures are genuinely inconsistent from run to run. Everything else, one well-tested prompt is still cheaper.
