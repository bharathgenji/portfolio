---
title: "Your Eval Suite Has a Shelf Life"
date: "2026-08-08"
summary: "A suite that scores 19/20 forever isn't proof your agent is solid — it might just mean nobody's checked whether it still covers what users actually ask."
tags: ["agents", "evals", "reliability"]
status: draft
author: "Bharath"
---

## The suite that stopped meaning anything

You built twenty evals at launch, wired them into CI, and watched the score hold at 19/20 for months. That felt like stability. It was actually a warning sign nobody read: the traffic your agent handles in month six looks nothing like the traffic it handled at launch, and your eval set is still a snapshot of month one.

New tools got added. A feature shipped that opened up a whole category of requests nobody was making before. Users found workarounds for things the agent used to refuse. None of that shows up as a failing test, because a static eval suite only tells you whether the agent still handles the twenty things you already knew about. It says nothing about the eighty things that showed up after you stopped looking.

The failure mode is specific: a regression lands in exactly the intent category your suite doesn't cover, ships clean through CI, and gets discovered by a user complaint instead of a red build. The suite didn't lie to you. It just stopped being asked the right questions.

## Coverage is a separate number from pass rate

Pass rate tells you how well you do on the cases you thought to write. Coverage tells you what fraction of real traffic those cases represent. Track both, because a suite can hold 100% pass rate while its coverage quietly drops to 20%.

Getting a coverage number doesn't require much: embed a sample of real production inputs, embed your eval inputs, and check how much of the production cluster space has an eval case sitting near it.

```python
def coverage_gap(prod_sample: list[str], eval_cases: list[str], threshold=0.75):
    prod_vecs = embed(prod_sample)
    eval_vecs = embed(eval_cases)
    uncovered = []
    for text, vec in zip(prod_sample, prod_vecs):
        best_sim = max(cosine_sim(vec, ev) for ev in eval_vecs)
        if best_sim < threshold:
            uncovered.append(text)
    return uncovered  # production inputs with no nearby eval case
```

Run this monthly, not once. `uncovered` is your to-do list — the shape of traffic your suite is currently blind to. It won't hand you expected outputs (pair it with [Use the Model to Generate Your Eval Cases](/playbook/use-the-model-to-generate-your-eval-cases) for that part), but it tells you *where* to point that generator instead of guessing.

## Retire cases too

The other half of shelf life: some of your original twenty describe a use case nobody hits anymore — a feature you deprecated, a workflow users abandoned once a better one shipped. Those cases still pass, still count toward your 19/20, and still tell you nothing. A case that no longer maps to real traffic isn't neutral, it's diluting your signal — it's occupying a slot that could hold something that matters now.

## The rule

Pass rate answers "does it still do what we tested." Coverage answers "are we still testing what it does." Ship a fixed eval suite and only the first question gets answered, forever, while the agent's real failure surface drifts somewhere else entirely.
