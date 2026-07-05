---
title: "Give Your Agent a Kill Switch"
date: "2026-07-05"
summary: "Ctrl-C on a running agent doesn't mean what you think it means — build a cancellation path that stops between actions, not mid-action."
tags: ["agents", "reliability", "production"]
status: published
author: "Bharath"
---

An agent is thirty steps into a run. Someone on your team notices it's looping on the wrong customer's account, or about to send fifty emails instead of five, and hits stop. What actually happens next depends entirely on where "stop" was implemented — and in most first-generation agent systems, it wasn't implemented anywhere except "kill the process."

Killing the process is the wrong tool. If the agent was mid-write when the process dies, you don't know whether that write completed. If it had three tool calls in flight, you don't know which ones landed. You've traded "agent doing something wrong" for "agent in an unknown state," which is worse.

## Stop points, not stop signals

A kill switch isn't a flag the model checks — models don't check flags, your executor does. The executor needs defined points where it's safe to stop, and it needs to check for cancellation at those points and nowhere else.

```python
def agent_loop(state: AgentState, cancel: CancelToken):
    while not state.done:
        if cancel.is_set():
            return state.mark_cancelled(safe=True)

        action = model.plan_next_action(state)
        result = execute(action)          # not interruptible mid-call
        state = state.update(result)

        if cancel.is_set():
            return state.mark_cancelled(safe=True)
    return state
```

The check happens before and after `execute`, never during it. A tool call that's already in flight runs to completion — you don't abort an in-progress database write or API call just because someone clicked stop a second earlier. That would produce exactly the unknown-state problem you're trying to avoid. The cancellation takes effect at the next safe boundary, typically within one tool-call's latency.

## Distinguish "stop the loop" from "undo what happened"

A kill switch stops future actions. It does not undo past ones. Conflating the two is how teams end up disappointed when "I hit stop" doesn't mean "everything is back to normal." If the agent already sent three of five emails before the cancel took effect, the kill switch's job is done — it prevented the other two. Reversing the three that went out is a separate operation, and only possible for actions you designed to be reversible in the first place.

Surface this distinction in whatever UI triggers the cancellation. "Run cancelled. 3 of 5 actions completed before stop took effect" is honest. A bare "Stopped" implies a rollback that didn't happen.

## Make it a first-class field on the run, not a side channel

Store `cancel_requested` on the run record itself, not in an in-memory variable on whichever process happens to be executing it. If your agent runs are dispatched to a worker pool, the process handling step 31 might not be the one that received the cancel request. Poll the run record, not a local flag:

```python
def is_set(self) -> bool:
    return run_store.get(self.run_id).cancel_requested
```

This costs one read per step — cheap relative to a model call — and it means "stop" works regardless of which worker picked up the run.

## Where this earns its keep

You need this the day you let an agent run more than a few steps unattended, because that's the day someone will watch it start going wrong in real time and want a button that actually does something. Build the stop points before you need them. The alternative is `kill -9` and a support ticket asking what state the account is actually in.
