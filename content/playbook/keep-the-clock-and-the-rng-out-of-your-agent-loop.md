---
title: "Keep the Clock and the RNG Out of Your Agent Loop"
date: "2026-07-09"
summary: "A resumed agent run that calls the system clock or a random generator directly won't reproduce the original run — it'll quietly diverge, and you'll debug the wrong thing."
tags: ["agents", "reliability", "determinism"]
status: published
author: "Bharath"
---

## The bug that only shows up on replay

You checkpoint an agent run, it crashes at step 12, you resume from the checkpoint, and the output is different from what it would have produced uninterrupted. Not wrong, exactly — just different. A different job ID. A different "expires in 4 hours" timestamp. A different sample from three candidate phrasings that were all equally valid. Nobody notices until an eval flags a mismatch, or a customer asks why the same request produced two different summaries a day apart, and the engineer debugging it goes looking for a logic bug that isn't there.

The actual cause: something inside the loop called `time.now()` or `random()` directly, and replay executed those calls at a different moment with a different seed than the original run did.

## Every direct clock or RNG call is a divergence point

Agent loops that support resume, replay, or audit need every step to be a pure function of state that was already recorded. The moment a step reaches outside that state — to ask the OS what time it is, or to draw a random number — it stops being reproducible from the checkpoint. It's not a bug in your checkpointing logic; it's a bug in what the loop is allowed to touch.

This is exactly why sandboxed workflow engines (Temporal, and increasingly agent orchestration layers) ban bare `Date.now()`, `Math.random()`, and unseeded `new Date()` inside workflow code — not as a style preference, but because those calls make the workflow unresumable by construction.

## Push time and randomness to the edges

The fix is boring and mechanical: never call the clock or the RNG from inside the loop. Generate the value once, outside, and pass it in as an argument.

```python
def run_step(state: AgentState, now: datetime, job_id: str):
    # now and job_id are recorded in state before this call.
    # the function never asks the OS or the RNG for anything.
    ...

# at the call site, once, before entering the loop:
run_step(state, now=datetime.utcnow(), job_id=str(uuid4()))
```

On resume, `now` and `job_id` come from the checkpointed state, not from a fresh call. Same inputs in, same outputs out, no matter how many times you replay it.

## Model sampling is nondeterminism too

The same discipline applies to the model call itself. Temperature above zero means two runs from an identical prompt can legitimately diverge, and that's fine for a first pass — but if you need a replayed run to match the original (for a debugging session, an audit, or an eval), record the actual completion in the checkpoint and replay it verbatim rather than re-invoking the model. Re-calling the model on resume isn't a bug the way a bare `Date.now()` is, but it's the same category of mistake: treating a nondeterministic source as if it were part of the recorded state.

## What this buys you

A replayed run that matches the original byte-for-byte turns "why did this happen" into a solved problem — you can single-step through the exact recorded trace instead of hoping a live re-run reproduces the symptom. Without it, every incident review starts by re-deriving whether the bug is even still there.
