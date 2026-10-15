---
title: "A Resized Screenshot Is a New Prompt to the Cache"
date: "2026-10-15"
summary: "A computer-use agent had its system prompt cached correctly and still paid full price on every call, because the screenshot sitting in front of the cache breakpoint was never byte-identical twice."
tags: ["agents", "cost", "multimodal"]
status: draft
author: "Bharath"
---

## The cache that should have worked

A team running a computer-use agent did the caching homework: static system prompt first, `cache_control` marker placed right after it, dynamic content downstream. Textbook ordering. The cache hit rate on text-only runs of the same agent was north of 90%. On vision runs — the ones that actually mattered, since computer use is the whole product — it sat near zero, and nobody could find the dynamic string that was supposedly busting it, because there wasn't one. The system prompt hadn't changed in weeks.

The culprit wasn't text at all. Between the system prompt and the cache marker, the pipeline inserted the current screen state — a screenshot — so the model always reasoned from a fresh view. Caching isn't a semantic match; it's a byte match over everything up to and including the cached span. Two screenshots of the pixel-identical screen, encoded a second apart by the same library with the same quality setting, are not the same bytes. JPEG encoders aren't guaranteed bit-reproducible across calls, screenshot libraries routinely stamp capture metadata into the file header, and plenty of teams draw a cursor marker or highlight box on top before sending — redrawn, anti-aliased, slightly different every time. Any of these put a moving target inside what was supposed to be a stable prefix.

## Position decides the blast radius

This matters more than it sounds like, because a cache breakpoint caches a *prefix*, not a slot. If the volatile image sits before the `cache_control` marker, you don't just lose the cache on the image — you lose it on everything up to that marker, including the system prompt you were so careful to put first:

```python
content = [
    {"type": "text", "text": SYSTEM_PROMPT},
    {"type": "image", "source": screenshot},            # changes every call
    {"type": "text", "text": instructions,
     "cache_control": {"type": "ephemeral"}},            # marker lands AFTER the image
]
```

Moving the marker doesn't fix it — the image is still inside the prefix wherever the marker lands after it. The fix is to keep anything non-deterministic entirely outside the cached span, not just after the system prompt:

```python
content = [
    {"type": "text", "text": SYSTEM_PROMPT,
     "cache_control": {"type": "ephemeral"}},            # marker BEFORE the volatile image
    {"type": "image", "source": screenshot},
    {"type": "text", "text": instructions},
]
```

## What to check before you trust the hit rate

If a screenshot genuinely needs to be cached — a reference image reused across retries of the same step, say — encode it once and reuse those exact bytes, don't regenerate it per call. Strip capture timestamps from image metadata. If you overlay a cursor or bounding box, render it to a fixed buffer once rather than redrawing it per request; anti-aliasing is nondeterministic enough across repeated renders to change the file even when every coordinate is identical.

Check your cache hit rate per content type, not just in aggregate — a vision agent with a good aggregate number can still be paying full price on its most expensive calls while the number looks fine on average.
