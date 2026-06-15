---
title: "Checkpoint at the Point of No Return"
date: "2026-06-15"
summary: "Long-running agents will fail mid-run. Checkpoint before irreversible actions and you restart from there, not from zero."
tags: ["agents", "reliability"]
status: draft
author: "Bharath"
---

## The expensive restart problem

Your agent works through 30 steps — searching, reading, reasoning — then writes a database record, sends an email, and crashes on step 33 because of a transient API error. You fix the error. Now what?

If you restart the whole run, you re-pay for 30 steps of work and risk re-sending that email. If you can't restart cleanly, an engineer traces the logs, figures out what completed, and patches the gap manually. Neither is acceptable at scale.

The fix is checkpointing: persisting agent state at well-chosen moments so restarts pick up where they left off.

## Where to checkpoint

Not every step needs a checkpoint. The useful moments are:

- **Just before an irreversible action** — writes, sends, external mutations
- **After an expensive computation** — a step that required 8 tool calls to complete
- **At plan milestones** — after a planning phase produces a confirmed plan

The implementation is mechanical:

```python
def agent_loop(state: AgentState):
    while not state.done:
        action = model.plan_next_action(state)

        if action.is_irreversible:
            checkpoint(state, "pre")   # rollback point
            result = execute(action)
            state = state.update(result)
            checkpoint(state, "post")  # fast-forward point
        else:
            result = execute(action)
            state = state.update(result)
```

The `pre` checkpoint is your rollback point if something goes wrong before the action completes. The `post` checkpoint is your fast-forward: if the agent crashes immediately after the action, you resume from `post` without re-executing it.

## What to put in state

State should be serializable and self-contained:

```python
@dataclass
class AgentState:
    run_id: str
    messages: list[dict]
    completed_actions: list[str]  # action IDs already executed
    artifacts: dict               # intermediate outputs
    goal: str
    done: bool = False
```

The `completed_actions` list is what makes idempotent restart possible. Before executing any action, check if its ID is already in the list and return the cached result instead. Your underlying tools don't need to be intrinsically idempotent — the state layer makes them idempotent at the agent level.

## Resume, not restart

```python
def run_with_recovery(run_id: str, goal: str):
    state = store.get(f"run:{run_id}:latest") or AgentState.new(run_id, goal)
    return agent_loop(state)
```

On failure, load the latest checkpoint and hand it back to the loop. The agent skips anything already in `completed_actions` and continues forward. No special recovery logic. No re-paying for work already done.

This also gives you a natural human review gate. The `pre` checkpoint is the moment just before a destructive step — if you want to require human approval before proceeding, you already have the pause point. Notifying a human and waiting for confirmation is a one-line addition at that location.

## The cost of skipping this

A 40-step run that fails at step 39 costs the same to restart as one that failed at step 1 — if you don't checkpoint. In practice, long-running agents get hand-nursed through failures by engineers who manually reconstruct state from logs. Checkpointing is the automation of exactly that process.

If your agent can't run unattended for an hour without you watching it, this is the first thing to add.
