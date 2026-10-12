---
title: "Your Eval Pass Rate Needs a Confidence Interval"
date: "2026-10-12"
summary: "A prompt change that moves your eval score from 81% to 84% on 40 examples usually isn't a win — it's noise with a sign attached."
tags: ["agents", "evals", "reliability"]
status: draft
author: "Bharath"
---

## The ship that wasn't a ship

A team swapped their system prompt, reran the 40-case eval suite, and watched the score go from 33/40 to 35/40. They shipped it. Two weeks later a different engineer reverted the same prompt, reran the same suite, and got 36/40. Neither run was wrong. Both were inside the noise band of a 40-example binomial sample, and nobody had ever computed what that band was. The team wasn't making decisions based on the eval — they were making decisions based on which random subset of edge cases happened to flip that day.

## A pass rate is a sample statistic, not a fact

An eval score of 83% on 40 examples isn't "the model is 83% accurate." It's one draw from a distribution, and with n=40 that distribution is wide. The standard error of a binomial proportion is roughly `sqrt(p(1-p)/n)` — at p=0.83, n=40, that's about 6 points. A 95% confidence interval is roughly ±12 points. Your "83%" result is honestly reported as "somewhere between 71% and 95%." Two runs that differ by 3 points aren't competing signals; they're the same number measured twice.

```python
import math

def ci95(successes, n):
    p = successes / n
    se = math.sqrt(p * (1 - p) / n)
    return p - 1.96 * se, p + 1.96 * se

ci95(33, 40)  # (0.70, 0.96) — an 8-point swing fits entirely inside this
```

This is why "start with twenty evals" gets you a smoke test, not a scoreboard. Twenty or forty examples are plenty to catch "the agent stopped calling the tool at all." They are not enough to adjudicate whether version B beats version A by three points.

## What changes once you compute it

Once you report an interval instead of a point estimate, three things happen. First, you stop shipping noise — a 3-point bump with a 12-point CI gets correctly ignored instead of celebrated. Second, you stop reverting good changes — a prompt that looks 2 points worse but is actually neutral doesn't get killed by panic. Third, you get honest pressure to grow the eval set, because the CI width is a direct, visible function of n: going from 40 to 400 examples cuts that ±12 down to roughly ±4, which is the only lever that actually buys you resolution.

For paired comparisons — same model, two prompts, same inputs — don't even use the independent-sample interval above. Run both variants on identical inputs and look at the *paired* difference (McNemar's test or just a paired bootstrap over the per-example deltas). This is dramatically more sensitive than comparing two marginal pass rates, because it cancels out the variance from "this example is just hard" instead of adding it to both sides.

## Where to stop

You don't need a statistician on staff. You need one function that turns `(successes, n)` into an interval, printed next to every score your harness emits, and a habit of asking "does this interval actually exclude the old score" before anyone writes "improved accuracy by X%" in a PR description. If the intervals overlap, you didn't learn anything — you need more examples, not a victory lap.
