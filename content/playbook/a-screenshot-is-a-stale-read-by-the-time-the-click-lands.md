---
title: "A Screenshot Is a Stale Read by the Time the Click Lands"
date: "2026-09-28"
summary: "The page your computer-use agent reasoned about and the page it's about to click are two different moments in time — and nothing forces those moments to match."
tags: ["agents", "computer-use", "reliability"]
status: draft
author: "Bharath"
---

## The insurance checkbox nobody asked for

A checkout agent takes a screenshot, reasons for a couple of seconds, and clicks the coordinates for "Place Order." The order that lands has a $12 shipping-insurance add-on checked. Nobody instructed that. The model never saw a checkbox for it, because there wasn't one — when the screenshot was captured. Between capture and click, an async widget finished loading, inserted an upsell checkbox above the button, and pushed every element below it down by sixty pixels. The model's coordinates were correct for the page it looked at. They landed on a different page that happened to occupy the same screen a moment later.

This isn't the coordinate-mapping bug where a resize ratio is silently wrong on every single call ([[downscale-the-screenshot-not-the-click-coordinates]]). That failure is consistent and therefore easy to spot once you look. This one is intermittent — right on most runs, wrong exactly when something on the page moved in the gap between observation and action — which makes it read as "the agent is flaky" instead of what it actually is: a stale read executed as if it were current.

## Observe-reason-act isn't one step

A computer-use loop treats "look at the screen, decide, click" as effectively instantaneous. It isn't. Capturing the screenshot, uploading it, running a model turn — longer if you're spending a thinking budget on a hard UI — and streaming back a tool call all take real wall-clock time, typically one to several seconds. Nothing about the page is obligated to hold still for that window. Ads finish loading, cookie banners animate in, prices update over a websocket, countdown timers redraw, validation messages appear on blur. None of that is exotic; it's the default behavior of a modern web page, and every one of those changes can shift the exact pixels your agent is about to click into.

The uncomfortable part: better reasoning makes this worse, not better. A bigger thinking budget or a harder decision means a longer gap between the frame the model judged and the frame the click actually hits.

## Verify the target immediately before you act on it

Don't dispatch the coordinate the model returned without checking that it still points at what the model thought it pointed at:

```python
def click_verified(x: int, y: int, expected_crop: Image, region: int = 40) -> bool:
    live = capture_region(x - region, y - region, x + region, y + region)
    if not perceptual_match(live, expected_crop):
        return False  # target moved — re-observe, don't fire blind
    dispatch_click(x, y)
    return True
```

`expected_crop` is a small patch around the target taken from the same screenshot the model reasoned over, cached alongside its tool call. The re-check right before dispatch costs one cheap local capture, not another model turn, and it turns a silent wrong click into an explicit "re-observe" branch — the same trade [[human-approval-is-a-snapshot-not-a-guarantee]] makes for a human's decision, done automatically and in milliseconds instead of waiting on a person. Where the automation layer exposes a DOM handle, resolve the visual target to it at decision time and verify that handle before clicking — a much stronger check than a pixel diff, with vision left to do what it's actually good at: picking the right element among several similar ones.

## What to watch

Log every time the pre-click check fails and forces a re-observation. A near-zero rate means blind coordinate execution is fine for that surface. A rate that climbs on a specific page is telling you that page mutates too fast for vision-only control, and that flow belongs on DOM-level actions instead of coordinates — before a customer notices the add-on you never offered them.
