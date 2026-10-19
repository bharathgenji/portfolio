---
title: "An Audio Token Doesn't Know Silence from Speech"
date: "2026-10-19"
summary: "Realtime voice models bill by the second of audio in the buffer, not by the words in it — and dead air on an open mic is the most expensive thing your agent will ever say nothing about."
tags: ["agents", "voice", "cost"]
status: draft
author: "Bharath"
---

## The bill that didn't match the transcript

A team shipped a voice agent for inbound support calls, built on a realtime speech-to-speech model: no separate STT/TTS step, the model consumes and emits audio directly. Cost modeling before launch was based on transcript length — average call had maybe 400 words each way, which mapped to a token estimate that made the unit economics work. Three weeks after launch, actual spend was running close to 4x that estimate. The transcripts looked exactly like the test transcripts. The calls did not.

The difference was hold time. Support calls have the caller go quiet while they dig up an account number, or the agent pauses to call a tool and wait on a result. None of that shows up in a transcript — dead air produces no words. But the model's input is a continuous audio stream, and a realtime API doesn't skip the silent parts. It tokenizes fixed-size chunks of the buffer at a fixed rate — OpenAI's Realtime API, for instance, bills input and output audio by the second, converted to a token-equivalent rate, regardless of whether that second contains a sentence or a held breath. A 45-second hold while the agent waits on a backend lookup is billed the same as 45 seconds of the caller actively talking.

## Why nobody noticed until the invoice

Transcript-based cost estimates are built from what the model *said*, because that's what's easy to log and read back. Nobody reviews a wall of silence in a QA pass, so the actual time-on-channel per call — which is what's actually metered — never shows up next to the thing engineers were optimizing against. The gap compounds with anything that adds latency on an open mic: a tool call the agent waits on before responding, a human escalation hold, a caller who multitasks mid-call. Every one of those is free in a transcript-based model and billed in a duration-based one.

## Measure channel-seconds, not transcript length

Track audio duration per call separately from token or word counts, split into caller-speaking, agent-speaking, and silence:

```python
def log_call_cost(call):
    metrics.record("audio.caller_speaking_s", call.caller_speech_duration)
    metrics.record("audio.agent_speaking_s", call.agent_speech_duration)
    metrics.record("audio.silence_s", call.total_duration - call.speech_duration)
```

If silence is a meaningful fraction of `total_duration` across your call population, that's the lever — not the prompt, not the model choice.

## Cut the silence, don't just measure it

Close the mic input the moment you detect the turn is the caller's to hold — most realtime APIs let you pause or clear the input audio buffer rather than stream dead air into the model. If the agent itself is the one waiting on a tool call, don't leave the channel open during the wait: play a short filler utterance and stop streaming input until you have something to say back, instead of letting a live buffer idle open on both sides while a database query runs.

## The check

If a voice agent's bill moves independently of its transcript volume across two otherwise-similar weeks, don't look at the model or the prompt — plot average silence-per-call next to the invoice. The two curves will match before anything else does.
