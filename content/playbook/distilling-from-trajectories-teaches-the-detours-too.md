---
title: "Distilling From Trajectories Teaches the Detours Too"
summary: "Filter your distillation set by final-answer correctness alone, and the cheap model inherits every wrong turn the expensive model took on its way to the right one."
date: "2026-10-04"
tags: ["agents", "distillation", "evals"]
status: draft
author: "Bharath"
---

## The distilled model that kept the teacher's bad habits

A team running a frontier model as a research agent wanted something cheaper for the ninety percent of queries that didn't need it. Standard move: log a few thousand production trajectories, keep the ones where the final answer graded correct, fine-tune a smaller model on the full tool-call sequence of each. The distilled model came back fast and cheap, just like the benchmark promised — and it was making the exact same unnecessary `search` call before every `search_internal_docs` call that the teacher model had been making, on queries where the internal-docs tool was obviously the right first move. Nobody had taught it that pattern on purpose. It was in forty percent of the training trajectories, because the teacher model had a habit of hedging with a broad search before narrowing, and every one of those trajectories still ended in the correct answer.

## Final-answer filtering only checks the destination

Gating a distillation set on "did this trajectory reach the right outcome" is the same mistake [[grade-the-trajectory-not-just-the-final-answer]] describes for evals, except here the consequence isn't a blind spot in your test suite — it's baked directly into the weights. A capable teacher model can take a wrong or wasteful step, notice, and recover, all inside one trajectory that still scores a clean pass. Fine-tune on that trajectory verbatim and you're not teaching "reach this answer" — you're teaching "take this exact path," wrong turn included, because the training objective has no notion of which steps were load-bearing and which were the model paying its own tax for not aiming well the first time.

The smaller model you're distilling into doesn't inherit the teacher's capability margin along with the habit. It learns the detour as normal behavior but has less headroom to reliably self-correct afterward, so on a meaningful slice of cases it just stops at the detour — the extra search, the redundant read, the tool call that never resolves anything — and either never reaches the second half of the pattern or reaches it less reliably than the model it was supposed to compress.

## Filter on path, not just on outcome

Score trajectories for directness before they go in the training set, not just for correctness:

```python
def directness_score(tool_calls: list[dict]) -> float:
    names = [c["name"] for c in tool_calls]
    repeats = sum(1 for i in range(1, len(names)) if names[i] == names[i - 1])
    unique_ratio = len(set(names)) / max(len(names), 1)
    return unique_ratio - 0.1 * repeats

def select_for_distillation(trajectories: list[dict], min_score: float = 0.6) -> list[dict]:
    return [
        t for t in trajectories
        if t["graded_correct"] and directness_score(t["tool_calls"]) >= min_score
    ]
```

This is a blunt instrument — tune the scoring to your own notion of a wasted step — but the principle holds regardless of the exact formula: a trajectory that passed only because the model recovered from its own detour is worse training data than one that got there directly, even though your outcome grader can't tell them apart.

## The rule

A correct final answer tells you the trajectory was safe to ship to the user. It tells you nothing about whether the trajectory is safe to teach a smaller model to imitate. Grade the path before you distill on it, or you're not compressing the teacher's competence — you're compressing its inefficiency and hoping the student has the same margin to spare.
