---
title: "A Client Disconnect Doesn't Cancel the Agent Loop Behind It"
date: "2026-10-16"
summary: "The user closed the tab on step 7 of 12, and the agent — still billing, still calling tools, still writing rows — had no way of finding out."
tags: ["agents", "reliability", "cost"]
status: draft
author: "Bharath"
---

## The run that outlived its own request

A support agent streams its progress to the browser over SSE while it works through a twelve-step task: pull the account, check entitlements, draft a response, send it. A user watches the first few steps, decides they don't need this after all, and closes the tab. Nothing in the stack treats that as an event. The HTTP handler's socket write starts failing silently into a closed connection, the orchestration loop never looks at the write's return value because streaming output was always best-effort, and the agent runs all twelve steps to completion — including the one that sends the email nobody is going to read a confirmation of.

Cost is the boring version of this problem. The expensive version is step 12 having a side effect: a row written, a ticket closed, a message sent on behalf of a user who walked away specifically to stop that from happening.

## Two layers that don't talk to each other

Your connection lifecycle and your agent loop are different pieces of code, usually written by different people, often months apart. The disconnect is visible at the transport layer — your web framework knows a socket closed. The loop doesn't poll the transport layer; it polls the model and the tool executor, in that order, over and over, with no reason to ever ask "is anyone still listening." Most teams check for disconnection exactly once, at the top of the request handler, before any work starts. That catches someone who closes the tab a hundred milliseconds after hitting submit. It does nothing for someone who closes it on step 7, because by then the check already ran and passed.

## Route the disconnect into the same cancellation path you already have

If you've built a kill switch ([[give-your-agent-a-kill-switch]]), you already have a `CancelToken` the loop checks between steps. Wire the transport layer into it instead of inventing a second mechanism:

```python
async def agent_loop(state, cancel: CancelToken, request: Request):
    while not state.done:
        if cancel.is_set() or await request.is_disconnected():
            cancel.set()
            return state.mark_cancelled(safe=True)
        action = await model.plan_next_action(state)
        result = await execute(action)          # in-flight calls still finish
        state = state.update(result)
    return state
```

Same caveat as any other cancellation point: a tool call already dispatched when the check fires still runs to completion, for the same reason a barge-in doesn't unwind a call already in flight ([[a-barge-in-doesnt-cancel-the-tool-call-already-in-flight]]). This stops step 8 through 12, not whichever step was executing at the exact moment the tab closed.

## Decide this on purpose, per endpoint

Not every run should die with its connection. A long export job a user expects to come back and check on later should survive — that's what a job handle is for ([[give-long-running-tools-a-job-handle-not-a-wait]]). A synchronous chat turn that only matters while someone's watching should not keep executing into the void. The bug isn't picking the wrong one of these; it's never picking, and getting "keeps running" by default because nobody wired the disconnect signal anywhere.
