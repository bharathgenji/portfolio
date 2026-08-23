---
title: "Score Your Evals by Criterion, Not by Task"
date: "2026-08-23"
summary: "A pass/fail eval score can hold steady at 18/20 for two straight weeks while your agent gets measurably better at one thing and worse at another — and you'll never see the tradeoff until a customer does."
tags: ["agents", "evals", "reliability"]
status: draft
author: "Bharath"
---

## The score that lied

A team I worked with shipped a prompt change to their booking agent. Eval suite: 18/20 before, 18/20 after. Shipped it as a wash. Two weeks later, support tickets about wrong cabin class were up, and tickets about wrong dates were down by roughly the same amount. The eval hadn't missed a regression — it had *seen* two regressions and one improvement and net them out to zero, because the grader asked one question per case: did this booking come out right, yes or no. A booking with the wrong seat class and a booking with the wrong date both score a 0. Different failures, same number.

Pass/fail is the natural default because it's easy to write and easy to trend. It's also lossy in exactly the direction that matters: it can't tell you *what* changed, only *whether the aggregate moved*. And on any real agent task, "whether it worked" is usually five or six independent things that all have to be true at once, each capable of drifting on its own schedule.

## Decompose the grade

Break each eval case into the criteria a human would actually check, and grade each one separately instead of collapsing them into a single verdict.

```python
def grade_booking(case: dict, result: dict) -> dict:
    return {
        "correct_dates": result["dates"] == case["expected_dates"],
        "correct_cabin": result["cabin"] == case["expected_cabin"],
        "under_budget": result["price"] <= case["max_price"],
        "no_duplicate_charge": result["charge_count"] == 1,
    }

def aggregate(cases: list[dict], results: list[dict]) -> dict:
    scores = [grade_booking(c, r) for c, r in zip(cases, results)]
    criteria = scores[0].keys()
    return {k: sum(s[k] for s in scores) / len(scores) for k in criteria}
```

Now a run doesn't produce one number, it produces a vector: `correct_dates: 0.95, correct_cabin: 0.80, under_budget: 1.0, no_duplicate_charge: 1.0`. Track that vector over time, not the collapsed sum. A prompt change that moves `correct_cabin` up and `correct_dates` down is visible as two lines crossing, not one flat line.

## What this catches that aggregate scores don't

**Tradeoffs, not just regressions.** A model swap that trades 5 points of date accuracy for 5 points of cabin accuracy is a decision someone should make on purpose, weighing which failure costs you more support load. An aggregate score doesn't even tell you the tradeoff happened.

**Which fix actually worked.** If you rewrote the cabin-class instructions specifically, the per-criterion score tells you whether *that* criterion moved. The aggregate could be flat for unrelated reasons and you'd wrongly conclude the rewrite did nothing.

**Slow-burning criteria nobody's watching.** Budget overruns might sit at 98% for months while everyone's staring at dates and cabin class, then quietly slide to 91% with no PR that looks suspicious in isolation, because no single change is big enough to move the aggregate.

## The bookkeeping cost is worth it

Decomposed grading costs you one thing: you have to write down what you're actually checking instead of eyeballing "did this look right." That's not overhead, that's the eval. If you can't list the criteria, you don't have a spec for the task — you have a vibe with a pass rate attached.
