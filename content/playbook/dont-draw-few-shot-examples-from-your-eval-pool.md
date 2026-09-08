---
title: "Don't Draw Few-Shot Examples From Your Eval Pool"
date: "2026-09-08"
summary: "If the labeled examples in your system prompt and the labeled examples in your eval set come from the same file, your eval score is measuring memorization, not the agent."
tags: ["agents", "evals"]
status: draft
author: "Bharath"
---

## The score that stopped meaning anything

A team building a support-ticket triage agent had a solid eval set — 80 labeled tickets, held out, run on every prompt change. Scores looked great through three prompt revisions, then dropped 15 points the week a new engineer regenerated the few-shot examples in the system prompt. Nothing about the agent's logic changed. What changed was which four labeled tickets got pasted into the prompt as examples — pulled, like always, from the same shared file of labeled tickets the eval set was also drawn from.

The eval had never been measuring generalization. For however many of those 80 eval tickets happened to also appear as few-shot examples in earlier prompt versions, the model wasn't classifying a ticket — it was pattern-matching against a nearly identical example sitting a few hundred tokens up in its own context. Swap the few-shot examples and you swap which eval tickets get that assist, and the score moves for reasons that have nothing to do with prompt quality.

## Why this is easy to miss

Nobody sets out to contaminate an eval. It happens because both the few-shot picker and the eval harness reach for the same natural source: "the labeled data we have." One engineer samples four clean, illustrative examples for the prompt; another holds out a chunk for eval; there's no registry tracking which IDs ended up where, so overlap is silent. Unlike train/test leakage in classic ML, nobody's watching for this in agent work because the "training" here is a handful of examples in a prompt, not a gradient update — it doesn't look like the kind of thing that leaks.

The tell is a score that's suspiciously stable across real prompt regressions, then jumps when someone touches the few-shot selection specifically. If your eval moves more when you change examples than when you change instructions, you're not evaling the agent's judgment — you're evaling how many eval items happen to resemble a few-shot.

## Keep the pools disjoint, and check it in code

Partition your labeled data once, by ID, into a few-shot pool and an eval pool, and never let a ticket cross the line in either direction:

```python
def assert_disjoint(few_shot_ids: set[str], eval_ids: set[str]) -> None:
    overlap = few_shot_ids & eval_ids
    if overlap:
        raise ValueError(f"{len(overlap)} IDs used as both few-shot and eval: {overlap}")
```

Run that assertion in CI, not just once at setup — the fastest way back into this trap is someone adding a fifth few-shot example six months from now, pulling from "the labeled data," unaware there's a partition to respect at all. Treat the split file itself as the source of truth, not a convention someone has to remember.

This pairs with [[freeze-tool-responses-in-evals]]: both are about making sure your eval measures the thing you changed, not some other variable that moved along with it for unrelated reasons.
