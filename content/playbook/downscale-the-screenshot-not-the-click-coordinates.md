---
title: "Downscale the Screenshot, Not the Click Coordinates"
date: "2026-08-26"
summary: "A computer-use agent that reasons about a resized screenshot but clicks in native screen coordinates isn't buggy at spatial reasoning — it's clicking in a coordinate system nobody told it exists."
tags: ["agents", "computer-use", "reliability"]
status: draft
author: "Bharath"
---

## The click that landed forty pixels off

A browser agent kept missing a "Confirm" button by a consistent, maddening margin — not randomly, always down and to the right, always by roughly the same ratio. The team's first instinct was to blame the model: maybe the screenshot was ambiguous, maybe the button label confused it, maybe it needed a better prompt describing the layout. None of that was it. The screenshot sent to the model had been downscaled to keep token cost down — a full 2880×1800 retina capture resized to 1280×800 before it ever reached the API. The model was reasoning correctly, in the pixel grid it was actually shown. The click handler, downstream, was dispatching those same numbers straight to the real screen at native resolution. Every coordinate the model produced was off by exactly the resize ratio, in both axes, on every single call.

## Where the two coordinate systems come from

This isn't an edge case — it's the default shape of a computer-use pipeline. A screenshot passes through at least one resize between capture and model input (deliberately, to control tokens, or incidentally, because a HiDPI display captures at 2x or 3x the CSS pixel grid). A browser automation layer often makes it worse: a CDP screenshot comes back in physical pixels while `element.click(x, y)` expects CSS pixels, and `devicePixelRatio` sits between them, unexamined, until someone's agent starts missing on retina laptops but working fine on plain 1080p ones. Add a second monitor with a non-zero origin offset and you get a third silent transform. None of these show up as an error. They show up as an agent that "sometimes can't click things," which reads exactly like a reasoning failure and gets debugged as one.

## Fix it at the boundary, not in the prompt

The model should never need to know a resize happened. Pick one coordinate space — the resized image you actually send — and convert at the single point where a coordinate crosses from model output into a real action:

```python
def capture_for_model(native_shot: Image, target_w: int = 1280) -> tuple[Image, float]:
    scale = target_w / native_shot.width
    resized = native_shot.resize((target_w, round(native_shot.height * scale)))
    return resized, scale

def click(x: int, y: int, scale: float, origin: tuple[int, int] = (0, 0)):
    native_x = round(x / scale) + origin[0]
    native_y = round(y / scale) + origin[1]
    dispatch_click(native_x, native_y)
```

`scale` and `origin` are session state, computed once per capture, never surfaced to the model and never something the model is asked to account for in its own arithmetic. Telling the model "the image is scaled by 0.444, adjust accordingly" is the same mistake as [[dont-let-the-model-carry-the-pagination-cursor]] — you're asking a probabilistic generator to carry an exact numeric transform verbatim through its reasoning, when a deterministic line of code does it for free and never drifts.

## Verify it once, not per session

Don't trust that the resize ratio you computed matches the ratio the OS or browser actually applied. On session start, click a known on-screen target — a corner marker, a test element with a fixed position — and confirm the resulting native coordinates land within a few pixels of where you expected. Bake that check into your computer-use test harness the same way you'd bake a golden-output check into an eval ([[test-your-tools-in-isolation]]); a scale mismatch is a single assertion away from being caught in CI instead of in a demo.

## The tell

If an agent's clicks are wrong by a consistent proportional offset — not random misses, not near-target-but-not-quite — stop looking at the prompt. Print the model's raw coordinate, the scale factor, and the coordinate you actually dispatched, side by side, for one failing click. The bug is almost always sitting in that gap, not in whatever the model was asked to see.
