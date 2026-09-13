---
title: "Batch Your Latency-Insensitive Agent Calls"
date: "2026-09-13"
summary: "Half the LLM calls in a typical agent pipeline don't need an answer in the next two seconds — routing them through a batch endpoint instead of the live API cuts cost in half for free."
tags: ["agents", "cost", "latency"]
status: draft
author: "Bharath"
---

## The default that costs you money for no reason

Most agent pipelines make every LLM call the same way: open a connection, send the request, block until a response comes back, move on. That's the right shape for a user waiting on a chat turn. It's the wrong shape for a nightly job that re-grades ten thousand retrieved chunks for relevance, labels a backlog of support tickets, or scores yesterday's agent transcripts against an eval rubric. None of those have a human staring at a spinner. They're running on a schedule, and the only thing that matters is that the results exist by morning.

Providers meter this distinction directly. Anthropic's Message Batches API, OpenAI's Batch API, and equivalents elsewhere charge roughly half the per-token price in exchange for a completion window measured in hours instead of seconds. If your pipeline sends that work through the synchronous endpoint out of habit, you're paying a latency premium for latency nobody's consuming.

## What actually qualifies

The test isn't "is this call slow to matter" — it's "does anything block on this specific response before some other deadline." Offline eval grading qualifies: [[grade-the-trajectory-not-just-the-final-answer]] and [[score-your-evals-by-criterion-not-by-task]] both describe grading passes that run after the fact, against a fixed dataset, with no user in the loop. Bulk classification and extraction qualify — relabeling a document corpus after a taxonomy change, backfilling structured fields on old records. Retrieval grading at index-build time qualifies, if you're precomputing relevance judgments rather than grading at query time. A live agent's next tool call does not qualify, and neither does anything inside a user-facing turn, no matter how tempting the discount looks.

## The shape of it

```python
requests = [
    {"custom_id": f"grade-{doc_id}", "params": {
        "model": "claude-haiku-4-5",
        "messages": [{"role": "user", "content": grading_prompt(doc)}],
    }}
    for doc_id, doc in corpus.items()
]
batch = client.messages.batches.create(requests=requests)
# poll batch.id until status == "ended", then pull results keyed by custom_id
```

`custom_id` is the part people skip and then regret. Batch results come back in arbitrary order, sometimes across multiple pages, and a failed individual request doesn't fail the batch — it just shows up as an error entry you have to match back to its input. Same lesson as [[a-batch-tool-call-needs-per-item-status-not-one-verdict]], one layer up the stack: a batch is N independent outcomes, and if you didn't stamp each request with an ID you can join on later, you've built a batch you can't actually read.

## Where this fits your architecture

This isn't a routing decision like [[route-calls-by-complexity]] — that's about which model handles a call. This is about which *lane* a call travels through, orthogonal to model choice. You can batch cheap-model calls and expensive-model calls both; the discount applies either way. The only architectural change is that any pipeline stage you move to batch needs to tolerate hours of latency and a poll-for-completion step instead of a return value. If your nightly re-grading job already runs as a cron task with no human waiting, that tolerance already exists — you're just not billing it at the rate it deserves.
