---
title: "A Completed Batch Isn't a Permanent Record"
date: "2026-11-10"
summary: "Your Message Batches results sit behind a results URL, not in your database — and that URL stops working on a clock that started the moment the batch finished, not the moment you meant to read it."
tags: ["agents", "batch-processing", "reliability"]
status: draft
author: "Bharath"
---

## The relabel job that vanished

A team re-scored eighteen months of support tickets against a new taxonomy using Anthropic's Message Batches API — cheaper and nobody was waiting on it, exactly the case [[batch-your-latency-insensitive-agent-calls]] describes. The batch finished overnight. The cron job that was supposed to pull `results_url` and write rows into the warehouse had a bug in its retry logic and silently failed for three weeks before anyone noticed the taxonomy table was still empty. By the time someone fixed the cron job and pointed it at the batch ID, the API returned `expired`. The processing had happened. The bill had already been paid. The output was gone.

Nobody had deleted anything. The batch results simply aren't a durable store — they're available for a window after the batch completes, and once that window closes, there's no retrieval path left, no matter how correct your batch ID is.

## The window is shorter than people assume

Batch results stay retrievable for 29 days after the batch finishes, not 29 days after you first check on it. If your consumer pulls results the same day, this never matters. If your consumer is a weekly job, a human waiting on a go-ahead, or anything with its own backlog, you're spending down a clock you can't see from the batch object's status field alone — `ended` doesn't tell you how many of your 29 days are left, only that the countdown has started.

The failure mode is specifically nasty because the batch's own status reporting gives you no warning. There's no `expires_in: 3 days` field screaming at you. You find out the window closed by trying to read results that are already gone.

## Treat the results URL as a pickup window, not storage

The fix isn't a shorter polling interval — it's not trusting the batch endpoint to hold your output at all. The moment a batch reports `ended`, copy the results somewhere you control, synchronously, as part of the same job that detects completion:

```python
def on_batch_complete(batch_id: str):
    batch = client.messages.batches.retrieve(batch_id)
    if batch.processing_status != "ended":
        return
    for line in client.messages.batches.results(batch_id):
        warehouse.write(custom_id=line.custom_id, result=line.result)
    # only now is this batch's output durable — the API copy is scratch space
```

Nothing downstream should ever read `results_url` a second time. Once you've copied the output into storage you own, the batch ID is irrelevant and the 29-day clock stops being your problem.

## Cancellation has the same trap in reverse

Cancelling a batch stops *unstarted* requests, but every request that already completed before the cancel landed is still billed and still subject to the same expiry — cancelling doesn't extend anything or refund the ones that finished. If you cancel because a job is stuck, go collect the partial results immediately; don't assume cancellation means there's nothing left to lose.

## The rule

A completed batch is a job, not a bucket. Pull results into storage you own the moment the batch ends, and build your completion-detection path and your result-persistence path as one step — not two jobs that can fail independently, with only one of them having a deadline nobody wrote down.
