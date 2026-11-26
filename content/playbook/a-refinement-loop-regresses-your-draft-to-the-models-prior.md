---
title: "A Refinement Loop Regresses Your Draft to the Model's Prior"
date: "2026-11-26"
summary: "Every individual pass through an 'improve this' chain reads like a fix — chain enough of them and the output quietly stops sounding like anyone."
tags: ["agents", "content-generation", "quality"]
status: draft
author: "Bharath"
---

## The editorial pipeline that made everything worse by making every step better

A content team built an agent pipeline for blog drafts: a clarity pass, a tone pass, an SEO pass, each one reading the previous pass's output and rewriting it to be "better." Every individual diff looked like an improvement — tighter sentences, smoother transitions, fewer hedges resolved into confident claims. Engagement on the published posts dropped anyway. Nobody could find the regression in any single pass, because there wasn't one. The damage was only visible across the whole chain, measured against the original draft nobody was still comparing to.

## What a rewrite pass is actually sampling from

A rewrite call doesn't have access to "what this specific writer meant." It has access to the text in front of it and a prior over what good writing in this genre looks like, built from everything the model saw in training. Every rewrite is a small pull toward that prior — the center of the distribution, not the edges where specific, opinionated, slightly unusual writing lives. A concrete number gets rounded toward a typical-sounding one. A sharp claim gets hedged into something more broadly defensible. A distinctive turn of phrase gets smoothed into the phrasing the model has seen most often for that kind of sentence.

One pass, that pull is negligible — you're mostly reading the editor fix a run-on sentence. Chain three or four passes, each one reading only the previous pass's output, and the pulls compound. It's the text equivalent of recompressing a JPEG every time you open it: each individual save looks fine, and the tenth generation is visibly mush, with no single save to blame for it.

## The fix: anchor every pass to the original, not the last pass

The chain compounds because each editor only ever sees its immediate predecessor — errors and drift both inherit forward with nothing to check them against. Give every pass the original alongside the current draft, and the model is editing a offset off a fixed anchor instead of continuously resampling itself:

```python
def refine(original: str, current: str, instruction: str) -> str:
    prompt = (
        f"Original draft:\n{original}\n\n"
        f"Current draft (after prior edits):\n{current}\n\n"
        f"{instruction}\n"
        "Preserve the original's specific claims, numbers, and voice. "
        "Only change what the instruction asks for."
    )
    return call_model(prompt)
```

Cap the chain at one or two passes regardless — the anchor slows the drift, it doesn't stop it. And don't grade this pipeline on a quality score alone; quality scores go up almost every pass by construction, since each pass is optimized to look like an improvement over what came right before it. Score the final output's similarity to the original's specific claims and phrasing too. That's the number that catches a pipeline sanding your draft down to the model's idea of generic competence, one defensible edit at a time.
