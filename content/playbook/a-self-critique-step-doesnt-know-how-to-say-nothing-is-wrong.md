---
title: "A Self-Critique Step Doesn't Know How to Say Nothing Is Wrong"
date: "2026-09-30"
summary: "A 'review your own work' pass reliably improves bad answers and just as reliably breaks good ones, because the model can't return an empty critique without looking like it skipped the step."
tags: ["agents", "reliability"]
status: draft
author: "Bharath"
---

## The diff that got worse on the second pass

A coding agent opens a PR, then runs a second pass: "review the diff you just wrote for bugs before finishing." On a genuinely broken diff, this catches real issues — off-by-one loops, a missing null check, an unhandled exception path. Teams ship this pattern because that case works, and it works often enough to look like a free win. Then it runs against a diff that's already correct, and the model doesn't return "no issues found." It finds an edge case that doesn't apply, "hardens" a function against an input the caller never produces, and introduces a new bug fixing a problem that didn't exist. The PR gets worse between the first pass and the second, and nothing in the pipeline flagged the second pass as the source.

## The critique step is graded on producing a critique

This isn't a reasoning failure, it's an incentive problem, the same shape as [[give-your-agent-an-escape-hatch]]: the model has been prompted to review and list issues, and a review that lists zero issues reads — to the model completing that turn — as a review that didn't try. Nothing in "list any problems with this diff" grants permission for the answer to be an empty list. So it isn't. The model finds something, because finding nothing looks like failure to do the assigned job, and generating a plausible-sounding nitpick is easy for a model that's good at generating plausible-sounding anything.

This compounds with self-preference: the same call that wrote the code is now grading it, which is the single-model version of what [[dont-let-the-model-grade-its-own-homework]] describes for judges — except here there's no second model to even disagree with.

## Give the critique pass a real exit

Make "no issues found" a structurally distinct, equally legitimate output, not a string the model has to choose to type over the more rewarded alternative:

```json
{
  "verdict": "no_issues_found",
  "issues": []
}
```

with a schema that requires `verdict` to be one of `no_issues_found` or `issues_found`, and requires `issues` to be non-empty only when `verdict` is `issues_found`. Then instrument the split: log the rate of `no_issues_found` per critique pass. If it's near zero across hundreds of runs on diffs you know are fine, your critique step isn't reviewing — it's confabulating on a schedule, and you're paying for a second model call to make your first answer worse.

## Where to draw the line

Self-critique is worth keeping for the failure modes that show up in real distributions of bad input — the same reason [[judge-before-acting]] gates high-stakes actions. It stops being worth it the moment it's applied uniformly to every output regardless of whether that output needed reviewing, because "always critique" and "always find something" are the same instruction to a model that has no other way to prove it did the work.
