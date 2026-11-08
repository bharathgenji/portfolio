---
title: "A Streamed Token Can't Be Unsent"
date: "2026-11-08"
summary: "Running your safety classifier on the finished turn works fine until you turn on token streaming — then the line it flags has already reached the user before the classifier ever saw it."
tags: ["agents", "safety", "streaming"]
status: draft
author: "Bharath"
---

## The line that already played

A voice support agent streams its reply straight to text-to-speech as tokens arrive, because waiting for the full turn before synthesizing audio felt like dead latency nobody needed. The moderation check — a classifier trained to catch unlicensed financial or medical advice — still runs the way it always has: once, on the completed transcript, right before the turn is logged. For months this worked, because the classifier only ever had to decide whether to log an incident, not whether to stop anything. Then a reply started with a confident, specific tax recommendation the company isn't licensed to give. By the time the classifier scored the finished turn and returned `blocked: true`, the sentence had already been synthesized and played through the customer's speaker. The incident report is accurate. It's also three seconds too late to matter.

## This isn't the retry problem

[[dont-stream-a-turn-you-might-retry]] covers a related failure — streaming a draft that a validator later rejects, so the user watches a contradiction unfold. That's a consistency bug: the fix is to buffer until you're confident the turn won't change. This is a different class entirely. The content here isn't wrong or inconsistent, it's disallowed, and some surfaces have no "disallowed" recovery path at all. A chat UI can strike through a bad message and show "this response was removed." A speaker cannot un-play a sentence. Treating both failures as "add a validation gate" misses that one of them requires the gate to sit *before* delivery, with no exceptions, and the other can tolerate occasionally being wrong after the fact.

## Moderate the chunk, not the turn

The fix isn't to drop streaming — it's to move the moderation boundary from "whole turn, after generation" to "each flushable chunk, before it leaves your process":

```python
buffer = ""
for delta in model_stream:
    buffer += delta.text
    if ends_sentence(buffer):
        if moderate(buffer).blocked:
            abort_stream()
            flush_fallback_notice()
            break
        flush_to_transport(buffer)
        buffer = ""
```

A sentence-level classifier call adds latency per chunk, not per turn — far cheaper than buffering the whole response, and cheap enough that most teams skip it specifically because the whole-turn check already exists and feels like it's covering this. It isn't. It's covering the log, not the mouth.

## Where the budget actually goes

This costs a classifier call per sentence instead of one per turn, which is real money and real latency on every response, moderated or not. Spend it where un-delivery is impossible — voice, push notifications, anything synthesized or rendered the instant it arrives — and skip it where a UI can still retract: a chat bubble you can delete client-side can afford the cheaper whole-turn check, because "removed after the fact" is a real, if embarrassing, option there.

## The rule

A moderation gate that runs after the content has already reached the user isn't a moderation gate — it's an incident logger wearing one. If the surface has no way to take back what it already delivered, the classifier has to clear each piece before that piece leaves your server, not after the whole turn finishes generating.
