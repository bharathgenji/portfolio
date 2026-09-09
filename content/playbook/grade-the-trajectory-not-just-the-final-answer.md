---
title: "Grade the Trajectory, Not Just the Final Answer"
date: "2026-09-09"
summary: "Two agent runs can produce the identical correct answer through completely different tool-call sequences — and only one of them will still be correct next week."
tags: ["agents", "evals"]
status: draft
author: "Bharath"
---

## Same answer, different agent

A refund agent has one safety rule: check whether a refund already exists before issuing a new one. Two versions of the agent both pass the eval case "issue a refund for order 4471." Version A calls `check_refund_status`, sees nothing on file, then calls `issue_refund`. Version B skips the check entirely and calls `issue_refund` directly. Both end with the same tool call, the same amount, the same closing message: "Refund processed." The eval grades the final answer against the expected answer, sees a match, and marks both a pass.

Version B ships. Two weeks later it double-refunds an order that already had a refund on file, because nothing ever verified it does the check — only that it reaches the same destination when the check wasn't needed in the first place. The eval set never happened to include a case with a pre-existing refund, so the missing step was invisible for as long as the held-out data stayed lucky.

## Final-answer grading is under-determined

This is the trajectory version of the problem [[score-your-evals-by-criterion-not-by-task]] describes for outcomes: a single scalar collapses information you need. Grading only the last message or the last tool call treats the path to get there as an implementation detail, but for anything with side effects — money moved, a message sent, a record written — the path *is* the spec. Many trajectories converge on the same correct-looking final state; most agent bugs live in the trajectories that converge on it for the wrong reason.

It's also why regressions here are quiet. Nobody removes the safety check on purpose. It disappears in a prompt rewrite, or a model upgrade decides the check is redundant given the context, and your eval — built to check "did the refund happen correctly" — has no way to notice that *how* it happened correctly just changed.

## Assert on the trajectory shape, not just the outcome

Alongside your final-answer grader, add assertions over the tool-call sequence itself:

```python
def grade_trajectory(tool_calls: list[dict]) -> dict:
    names = [c["name"] for c in tool_calls]
    return {
        "checked_before_refund": (
            "check_refund_status" in names
            and names.index("check_refund_status") < names.index("issue_refund")
        ),
        "no_duplicate_issue_refund": names.count("issue_refund") <= 1,
    }
```

These don't replace outcome grading, they run beside it. A case can score 1.0 on the final answer and 0 on `checked_before_refund` — that gap is the signal. Write one trajectory assertion per invariant that would be expensive to violate in production, not one per tool call; you're encoding "this step is load-bearing," not transcribing the happy path.

## The rule

If two different tool-call sequences can produce the same graded output, your eval can't tell them apart — and can't tell you when a change quietly swapped a safe one for a lucky one. Grade the steps that matter, not just the sentence at the end.
