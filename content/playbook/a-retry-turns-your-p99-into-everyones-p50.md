---
title: "A Retry Turns Your p99 Into Everyone's p50"
date: "2026-09-03"
summary: "Your per-tool p99 looks fine on the dashboard because nobody's tracking what happens when a six-step chain rolls that 1-in-100 die six times a run."
tags: ["agents", "latency", "reliability"]
status: draft
author: "Bharath"
---

## The dashboard said p99 was fine

A team ran a support agent with six sequential tool calls per turn — retrieval, two lookup APIs, a calculation tool, a formatter, a final verification pass. Every tool's latency dashboard looked healthy: p50 around 900ms, p99 around 3.5s, well inside their alerting threshold. Support tickets calling the agent "slow" kept coming in at a rate nobody could reconcile with "less than 1% of calls are slow." The dashboards weren't lying. They were answering the wrong question.

## Percentiles don't compose the way you'd guess

A per-tool p99 tells you how bad the worst 1-in-100 *call* is. A run isn't one call — it's a chain. The probability that a run hits at least one tail event across `N` independent steps is:

```
P(run hits a tail) = 1 - (1 - p) ** N
```

At `p = 0.01` and `N = 6`, that's `1 - 0.99**6 ≈ 5.85%`. What your monitoring reports as a rare 1-in-100 event is actually landing on roughly 1 in 17 *runs*. That's not a tail anymore — it's a regular part of the user experience, and it's invisible if every dashboard you own is scoped to a single tool. This is the same shape of problem distributed-systems people call tail latency amplification, except an agent chain makes it worse than a typical fan-out: your steps run sequentially, so each tail event adds its full duration to the total instead of being hidden behind whichever parallel branch finishes last.

## Retry backoff compounds the same tail it's trying to fix

Retries don't cancel the problem, they add another draw from it. A step with a 3s timeout and two retries at 1s/2s backoff turns one flaky call into an 11-second detour — inserted silently, in the middle of a chain, while the user watches a spinner that gives no indication anything went wrong. Multiply that across a chain and the run that hits *two* retried steps is not a freak occurrence; at `N = 6` and `p = 0.01` it's roughly a 1-in-700 run, which at real traffic volumes shows up in your ticket queue every week.

## Measure run-level tail, not call-level tail

Track the fraction of runs that contained any retried step, not just each tool's own percentile:

```python
def run_had_retry(step_traces: list[dict]) -> bool:
    return any(s["attempt"] > 1 for s in step_traces)

def report(runs: list[dict]) -> dict:
    n = len(runs)
    retried = sum(run_had_retry(r["steps"]) for r in runs)
    return {
        "pct_runs_with_retry": retried / n,
        "p99_run_latency_ms": percentile([r["total_ms"] for r in runs], 99),
    }
```

If `pct_runs_with_retry` is meaningfully higher than any single tool's own failure rate, that gap *is* the compounding, quantified. Alert on that number, not on any individual tool's p99 — it's the one that tracks what a real fraction of your users actually sit through.

## What actually helps

Run independent steps in parallel wherever the chain allows it, so tail events overlap instead of stacking end to end. Budget retries against the run's overall deadline rather than a fixed per-call `max_attempts`, so one flaky step early in the chain can't spend the time budget a later step needed ([[give-your-agent-a-deadline-not-just-a-budget]]). And keep infrastructure retries out of the model's context regardless ([[retry-transient-errors-before-they-reach-the-model]]) — that's a separate problem from this one, and fixing it won't fix this one.

A chain is only as fast as the probability that nothing in it draws a bad number, and that probability gets worse with every step you add.
