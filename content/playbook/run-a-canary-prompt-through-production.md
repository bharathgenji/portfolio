---
title: "Run a Canary Prompt Through Production"
date: "2026-07-30"
summary: "A pinned model ID doesn't guarantee a pinned answer — the only way to catch silent drift is to keep asking your live agent the same question and watching for a different one."
tags: ["agents", "reliability", "monitoring"]
status: published
author: "Bharath"
---

## Pinning the model ID isn't the whole fix

You pinned the model to a version-specific ID instead of an alias — good, that stops the provider from swapping checkpoints out from under you. But "pinned" doesn't mean "frozen." Providers reroute traffic across hardware, adjust serving infrastructure, and occasionally patch inference-time behavior without minting a new model ID. Your retrieval index gets re-embedded. A downstream API your tool calls against changes its response shape in a way that's still valid JSON but means something different. None of these show up as a deployment. None of them fail a health check. Your evals passed the last time you ran them — which was the last time you deployed, not five minutes ago.

The gap is temporal. Evals run once, at ship time, against a snapshot of the world. Production runs continuously, against a world that keeps moving. Nothing in a CI pipeline tells you the agent's behavior shifted on Tuesday afternoon for reasons that have nothing to do with your code.

## Ask the same question, forever

Pick two or three requests with stable, checkable answers — not edge cases, boring representative ones. "Summarize this fixed 200-word document." "What's the refund policy for a standard order?" where the answer key lives in a doc you control. Run them through the *actual* production path — same model ID, same tool set, same context-assembly code, same retrieval index — on a schedule, and diff the output against a known-good baseline.

```python
def run_canary(canary: CanaryCase) -> None:
    result = run_agent_production_path(canary.input)
    score = judge_similarity(result.output, canary.expected_answer)
    metrics.gauge(f"canary.{canary.name}.similarity", score)
    if score < canary.threshold:
        alert(f"canary '{canary.name}' drifted: {score:.2f} < {canary.threshold}",
              got=result.output, expected=canary.expected_answer)
```

Use a judge call or embedding similarity for the comparison, not exact string match — a good agent won't phrase things identically run to run, and you'd drown in false positives. What you're watching for is semantic drift: the refund window changing from 30 days to 14, the summary suddenly omitting the number that mattered, a tool call that used to fire no longer firing.

## Run it on the same cadence as your risk tolerance

Daily is enough to catch a slow rot. Hourly is what you want if the agent handles anything with a real cost per wrong answer — a canary that runs once a day means a bad answer sits in production for up to 23 hours before anyone notices. The canary is cheap: a handful of calls against a fixed input, run on a timer, completely decoupled from your deploy pipeline. That decoupling is the entire point — it catches the drift that happens *between* deploys, which is exactly the drift nothing else is watching for.

## What it won't catch

A canary only samples the paths its fixed inputs exercise. It won't tell you the agent started mishandling a request shape it's never been asked about — that's still your eval suite's job, and [shadow traffic](/playbook/shadow-new-agent-versions-against-real-traffic)'s job for candidate versions. The canary's job is narrower and cheaper: prove that the answer to a question you already know the answer to hasn't quietly changed.
