---
title: "Give Every Agent Action a Compensating Action"
date: "2026-07-10"
summary: "Idempotency stops duplicate side effects on retry — it does nothing for the invite your agent already sent before step 6 failed for good."
tags: ["agents", "reliability", "orchestration"]
status: draft
author: "Bharath"
---

## The gap idempotency doesn't cover

You've made your agent's writes idempotent. You've added checkpoints before irreversible steps. Good — that solves retries. It does not solve this: step 4 sends a calendar invite, step 5 provisions a workspace, step 6 fails permanently because the user's plan doesn't support the feature the agent just tried to provision. There's no retry that fixes this. The invite is sent. The workspace exists. The run is dead, and nothing rolls it back.

This is a different failure mode from the one idempotency and checkpointing solve. Those make a *repeated* action safe. Neither one makes a *committed* action reversible when a later, unrelated step fails. For that you need the thing distributed systems have used for two decades: a saga — every forward action paired with an explicit compensating action.

## Pair actions, don't just log them

The fix isn't clever. When you execute a mutating step, register its undo alongside it, before you move on:

```python
def run_step(state, step):
    result = step.execute(state)
    state.completed.append({
        "step": step.name,
        "result": result,
        "compensate": step.compensation_ref(result),  # e.g. "cancel_invite:evt_abc123"
    })
    return state
```

`compensate` isn't a closure — closures don't survive a crash. It's a reference: an action name plus the arguments needed to undo *this specific* execution, serializable and stored with the checkpoint.

## Unwind in reverse order on terminal failure

When a step fails in a way retries won't fix, walk `completed` backward and run each compensation:

```python
def unwind(state):
    for entry in reversed(state.completed):
        compensator = COMPENSATIONS[entry["compensate"]["action"]]
        compensator(**entry["compensate"]["args"])
    state.completed.clear()
```

Cancel the invite. Deprovision the workspace. Refund the charge. Order matters — undo in the reverse of the order you did it, same as unwinding a stack.

## Not everything needs a compensation

Read-only steps need none. Some writes are cheap to leave dangling — a log entry, a draft that nobody sees. Reserve this for actions with user-visible or billable consequences: anything sent, charged, provisioned, or granted. If you can't write a sane compensation for a step (some things genuinely can't be undone — a sent SMS, a posted tweet), that's a signal the step needs a confirmation gate before it runs, not after it fails.

## Where this actually saves you

The value shows up in the incident you don't have: a multi-step agent workflow fails at step 6 of 9, and instead of a support ticket about a phantom workspace and an unwanted calendar invite, the run unwinds itself cleanly and reports "failed, rolled back" to the caller. Build the compensation at the same time you build the action — retrofitting it after the first orphaned side effect shows up in production is the expensive way to learn this.
