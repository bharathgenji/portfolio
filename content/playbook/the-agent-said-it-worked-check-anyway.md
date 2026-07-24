---
title: "The Agent Said It Worked. Check Anyway."
date: "2026-07-21"
summary: "A completion summary is a claim the model is making about the world, not a measurement of it — verify the outcome independently before you believe it."
tags: ["agents", "reliability", "verification"]
status: published
author: "Bharath"
---

## The bug that closed itself

An agent is told to fix a failing test. It edits the source file, calls `task_complete(status="success", summary="Fixed the null check; tests now pass")`, and the run closes. Nobody re-runs the suite, because the agent said it passed. Three days later a teammate pulls the branch, runs `pytest`, and the same test is still red — the agent edited the wrong function, watched the test output scroll by without actually reading the failure line, and wrote a plausible-sounding summary anyway.

Nothing malicious happened. The model wasn't lying in the sense of knowing better. It generated the token sequence most consistent with "a competent engineer just finished this task," and that sequence includes a confident closing statement. The summary field of a completion tool ([[give-your-agent-a-done-tool]]) is text generated under the same next-token objective as everything else the model writes — it is not wired to the actual exit code of the test run.

## A claim is not a measurement

Treat every completion summary as a hypothesis, not a fact. The model's job was to make the change; verifying the change is a separate job, and it should run outside the agent's own turn, driven by your orchestrator, using ground truth the model didn't generate.

```python
def run_task_and_verify(task, verify_fn):
    result = run_agent(task)  # returns the task_complete payload
    if result["status"] != "success":
        return result

    verified = verify_fn()  # independent check: exit code, diff, API response
    if not verified.ok:
        return {
            "status": "failed",
            "summary": f"Agent claimed success; verification found: {verified.reason}",
            "agent_summary": result["summary"],
        }
    return result
```

`verify_fn` has to be something the agent can't talk its way past — an actual `pytest` exit code, a diff against expected output, a re-fetch of the record the agent claims it updated. Not another LLM call asking "did this work?" against the same transcript; that just relocates the trust problem one hop over ([[dont-let-the-model-grade-its-own-homework]]).

## Where this bites hardest

**Multi-step pipelines.** If stage two trusts stage one's summary instead of stage one's actual artifact, a false "success" propagates silently and the failure surfaces three stages later, disconnected from its cause.

**Anything with a slow feedback loop.** Deploys, data backfills, migrations — cases where nobody re-checks for hours or days because the completion message already said it was fine.

**Tasks with ambiguous success criteria.** "Improve the error message" has no exit code to check, which is exactly when teams skip verification and lean hardest on the summary — precisely backwards, since fuzzy criteria are where the model is most likely to convince itself prematurely.

## The rule

Never let an agent's own account of its work be the last check in the pipeline. Pair `task_complete` with a `verify_complete` that reads from the world, not from the model's transcript. The gap between "the model says it's done" and "it's done" is exactly where the expensive bugs live — the ones that look closed in your logs and open in production.
