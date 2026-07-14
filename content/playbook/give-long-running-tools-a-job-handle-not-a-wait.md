---
title: "Give Long-Running Tools a Job Handle, Not a Wait"
date: "2026-07-08"
summary: "A tool that blocks for ten minutes doesn't just risk a timeout — it burns a model turn on nothing, so return a job handle instead and let the agent poll."
tags: ["agents", "tool-design", "async"]
status: published
author: "Bharath"
---

## Some tools don't fit in a turn

A deploy takes four minutes. A training job takes forty. A video render, a full-repo test suite, a bulk data migration — none of these finish inside the window you'd reasonably hold a tool call open for. Yet the natural way to write a tool is synchronous: call it, block, return the result. For fast tools that's correct. For slow ones it's how you end up with an agent turn hung for ten minutes waiting on a single `run_deploy` call, no partial signal, nothing to show the user, and a timeout wrapper (you have one — see [Set a Hard Timeout on Every Tool Call](/playbook/timeout-every-tool-call)) that fires before the job is even half done.

The fix isn't a longer timeout. It's not making the tool synchronous at all.

## Return a handle, not a result

Split the tool in two. The first call kicks off the work and returns immediately with a job ID:

```python
def start_deploy(service: str, version: str) -> dict:
    job_id = deploy_queue.enqueue(service, version)
    return {"job_id": job_id, "status": "queued"}
```

The second call checks status, and only status:

```python
def check_deploy(job_id: str) -> dict:
    job = deploy_queue.get(job_id)
    return {"status": job.status, "detail": job.detail}
```

The agent calls `start_deploy`, gets a job ID back in under a second, and the turn ends cleanly. Your orchestrator — not a blocked tool call — decides what happens next.

## The polling loop lives outside the model, mostly

Don't make the model responsible for spacing out its own poll calls. Left alone, it'll either poll every single turn (burning a full round trip every few seconds) or forget to poll at all once something else grabs its attention. Put backoff in the tool contract instead:

```python
def check_deploy(job_id: str) -> dict:
    job = deploy_queue.get(job_id)
    if job.status == "running":
        return {"status": "running", "poll_again_in_seconds": next_backoff(job)}
    return {"status": job.status, "detail": job.detail}
```

`next_backoff` returns something like 5s, 15s, 30s, capping around a minute. The number is advisory — the model can't literally sleep — but it's a strong instruction the model follows far more reliably than an unstated expectation, and your orchestrator can enforce it as a hard floor between poll calls regardless of what the model does.

## Set a ceiling and a terminal state

Every job needs a maximum lifetime after which the tool stops saying "running" and starts saying "timed out, here's how to check manually." Without this, a job that's actually wedged looks identical to one still in progress, and the agent polls forever, quietly, a turn at a time.

```python
if time.monotonic() - job.started_at > job.max_lifetime_seconds:
    return {"status": "timed_out", "detail": f"exceeded {job.max_lifetime_seconds}s, check job {job_id} manually"}
```

`timed_out` is a distinct terminal state from `failed` — the agent should handle them differently. A failure means retry or escalate with a known cause. A timeout means the underlying job might still finish; it just outran your patience. Don't collapse the two or you'll retry jobs that are still quietly running, or give up on ones that failed fast.

## Why this beats a longer synchronous timeout

The instinct when a tool call times out is to raise the limit. That only delays the same problem and adds a new one: a model turn that's blocked for minutes is a model turn where the agent can't do anything else — can't update the user, can't work on a parallel task, can't be interrupted. A job handle turns dead time into free time. The agent can check on three jobs, work on something unrelated in between, and come back — which is the whole point of giving it a loop instead of a script.
