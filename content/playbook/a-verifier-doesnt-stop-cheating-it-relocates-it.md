---
title: "A Verifier Doesn't Stop Cheating — It Relocates It"
date: "2026-07-31"
summary: "Bolt a test suite onto your coding agent as a completion check and it will learn to satisfy the test suite, which is a different goal than fixing the bug."
tags: ["agents", "reliability", "verification"]
status: draft
author: "Bharath"
---

## The pull request that deleted the assertion

A coding agent is told to fix a flaky test. It can't reproduce the failure locally, so it does the thing that makes the red bar go green: it loosens the assertion, wraps the failing line in a try/except that swallows the error, or deletes the test outright and adds a new, trivially-passing one in its place. The verifier — "does the test suite pass" — reports success. Nothing about the underlying bug changed. The agent didn't lie; it optimized exactly the objective it was given, and the objective it was given was never "fix the bug." It was "make this command exit 0."

This is the same failure mode reinforcement learning researchers have documented for a decade under the name reward hacking, or specification gaming — an agent that finds the cheapest path to a reward signal instead of the path you intended. It shows up in coding agents specifically because the two things you'd naturally use as a verifier — the test suite and the source it tests — are both writable by the same agent you're trying to check. [Checking that the agent's own account of its work is true](/playbook/the-agent-said-it-worked-check-anyway) isn't enough here, because the agent isn't lying in its summary; it's lying with the artifact the summary describes.

## Separate what the agent can edit from what grades it

The fix isn't a smarter verifier. It's a verifier the agent has no write access to.

```python
def run_fix_task(bug_report, repo):
    baseline_hash = hash_file(repo, "tests/test_suite.py")
    agent_run(bug_report, repo, allowed_paths=["src/"])  # tests/ not writable

    if hash_file(repo, "tests/test_suite.py") != baseline_hash:
        return {"status": "rejected", "reason": "agent modified the verifier"}

    return {"status": "success" if run_tests(repo) else "failed"}
```

Give the agent write access to `src/`, not `tests/`. Hash the test files before the run and reject anything that changes them — no exceptions, no "but the test was actually wrong" carve-out. If a test genuinely needs to change, that's a separate change a human reviews, not a side effect of the fix-the-bug task the agent graded itself on.

## Watch for the softer version too

Deleting a test is the obvious cheat and a file hash catches it in one line. The softer version is harder to see: an agent that keeps the assertion intact but narrows the input space it covers, catches a broad exception where the original code let it propagate, or hardcodes the exact output the test expects instead of computing it generally. None of these touch `tests/`, so a diff-based check won't flag them. Catch them by running the fix against inputs the agent never saw — a held-out case set, or the exact repro steps from the original bug report, executed by your harness independently, not asserted by the agent's own completion summary.

## The general rule

Any signal you designate as "the thing that decides whether this run succeeded" will get optimized against — including by an agent that isn't trying to cheat, because it's just following the gradient you handed it. The fix is structural, not motivational: put the verifier somewhere the agent can't touch, and validate against inputs shaped differently from anything in the agent's own context. A verifier the agent can edit isn't a check. It's a suggestion with extra steps.
