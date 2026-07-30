---
title: "Fan-Out Multiplies Failure, Not Just Cost"
date: "2026-07-29"
summary: "Eight sub-agents at 95% success each sounds fine until you multiply — the batch succeeds two times in three, and no single dashboard shows why."
tags: ["agents", "multi-agent", "reliability"]
status: published
author: "Bharath"
---

## The batch that failed without a culprit

An orchestrator splits a report into eight sections, fans out one sub-agent per section, and assembles the results. Each sub-agent has a 95% success rate — checked, logged, dashboarded, genuinely fine on its own. You ship it. A week later, a third of the reports come back incomplete, and every per-agent success metric still reads 95%. Nobody can find the flaky component, because there isn't one. The math was never about any single agent.

Eight independent steps at 95% each, all required, compound to 0.95⁸ ≈ 66%. Double the fan-out to twenty sections and you're at 0.95²⁰ ≈ 36% — worse than a coin flip, built entirely out of components that look excellent in isolation. This is the same arithmetic as a service with five sequential 99.9%-available dependencies landing at 99.5% end-to-end, except agent teams rediscover it themselves because "success rate" gets reported per tool call, and per-call numbers never surface the multiplication happening one level up.

## Track the batch rate as its own metric

Per-component success and end-to-end success are different numbers and need different alarms. If you only log the former, a real batch-level regression hides behind healthy-looking component graphs indefinitely.

```python
def run_fanout(sections: list[str]) -> dict:
    results = {s: run_subagent(s) for s in sections}
    ok = {s: r for s, r in results.items() if r.success}
    metrics.gauge("subagent.success_rate", len(ok) / len(sections))
    metrics.gauge("batch.complete", int(len(ok) == len(sections)))
    return results
```

`batch.complete` is the number that tells you whether users are getting whole reports. Alert on it directly — don't infer it from the per-call rate, which will look fine long after the batch rate has quietly collapsed.

## Retry the slice, not the batch

The instinct after seeing this is to retry the whole fan-out on any failure. Don't — at 95% per step, retrying all eight because one failed multiplies your token spend by roughly 8x on the unlucky runs for no reason, since seven of the eight already succeeded. Retry only the slice that failed:

```python
def run_fanout_with_retry(sections: list[str], max_retries=2) -> dict:
    results = {s: run_subagent(s) for s in sections}
    for attempt in range(max_retries):
        failed = [s for s, r in results.items() if not r.success]
        if not failed:
            break
        results.update({s: run_subagent(s) for s in failed})
    return results
```

One retry at 95% per step turns a 66% batch-completion rate into roughly 98% — the compounding runs in your favor once failures are independent and retried in isolation, instead of against you when they're bundled into an all-or-nothing run.

## Decide which slices are load-bearing before you ship

Not every section is essential. If the batch can degrade gracefully — publish seven of eight sections with a note, rather than blocking on the eighth — say so explicitly in the aggregator instead of discovering it during an incident. Mark slices `required` or `best_effort` up front, the same way you'd reserve a deadline slice for a mandatory step: decide the tradeoff once, in code, not under pressure when the ninth report of the day comes back empty.
