---
title: "A Barge-In Doesn't Cancel the Tool Call Already in Flight"
date: "2026-09-29"
summary: "The user interrupts, the audio stops, and everyone acts like the turn is undone — but the tool call that turn triggered is still running on a different clock."
tags: ["agents", "voice", "reliability"]
status: draft
author: "Bharath"
---

## The cancellation that didn't cancel anything

A voice support agent hears "cancel my subscription," calls `cancel_subscription`, and starts speaking a confirmation. Two seconds in, the caller talks over it: "wait, no, I meant pause it." Barge-in detection fires, playback cuts off mid-sentence, and the model gets a fresh turn with the correction. It apologizes, calls `pause_subscription`, and the call ends looking clean in the transcript. The subscription is still canceled. Nobody rolled that back, because nothing in the pipeline thought it needed to.

## Interruption stops what the user hears, not what the backend runs

Voice pipelines are pipelined on purpose: STT, the model turn, and TTS playback overlap so latency stays low. Barge-in detection lives entirely in the audio layer — it watches for incoming speech and cuts the outbound stream. But the tool call for that turn was already dispatched the moment the model emitted it, well before TTS caught up to that point in the response. Stopping playback stops a stream of audio. It does nothing to a request that's already sitting in your backend's execution queue, possibly already committed by the time the interruption signal even reaches your orchestration code.

This is the voice-specific version of a problem [[human-approval-is-a-snapshot-not-a-guarantee]] and [[a-screenshot-is-a-stale-read-by-the-time-the-click-lands]] both describe: the thing you're reacting to is not the current state of the world, it's a moment you've already fallen behind. In text agents that gap is small. In voice, TTS playback deliberately trails the model by seconds to sound natural, which stretches that gap into a window wide enough for a whole tool call to complete inside it.

## Thread a cancellation token, don't just mute the speaker

Give every turn a cancellation token and pass it into the tool executor, not just the audio player:

```python
async def execute_tool(call, cancel_token: CancelToken):
    if cancel_token.is_set():
        return {"status": "skipped", "reason": "superseded_by_barge_in"}
    return await dispatch(call, cancel_token)
```

For calls the executor can check before committing — most reads, many writes gated behind a final confirm step — this stops the action outright. For calls that don't poll a token mid-flight (most external API calls don't), the token arrives too late by design, and no amount of plumbing fixes that after the fact.

That's why this only works layered on top of what you'd already want for any side-effecting tool: make it idempotent so a retry after a real cancellation doesn't double up ([[idempotent-agent-actions]]), and give irreversible actions a compensating action so a cancellation that loses the race still has an undo path ([[give-agent-actions-a-compensating-action]]).

## What to watch

Log every barge-in event alongside whether a tool call was in flight at that moment, and whether that call was reversible. A nonzero rate against irreversible tools — cancellations, transfers, deletions — is your actual exposure. Fix those tools first; a barge-in racing a read-only lookup was never the problem.
