---
title: "An Image in Tool Results Gets Billed Every Turn It Stays in Context"
date: "2026-08-22"
summary: "A screenshot tool that looked cheap in the demo turns a ten-turn browsing agent into a bill that grows quadratically, because nobody re-sends a paragraph of text on every turn — but everyone re-sends the image."
tags: ["agents", "cost", "multimodal"]
status: draft
author: "Bharath"
---

## The bill that didn't match the task

A browsing agent took a screenshot after every action — click, scroll, screenshot, decide what to do next — for up to fifteen steps. Each screenshot, base64-encoded at a decent resolution, ran 1,000–1,500 tokens. Nobody thought that was a problem; a page of text costs more. The bill said otherwise: a fifteen-step run was costing as much as a run ten times longer on a text-only agent doing comparable reasoning.

The bug wasn't the screenshot tool. It was where the screenshot went once it was taken. Standard agent-loop plumbing appends every tool result to the messages array and resends the whole array on every subsequent call, because that's how the model sees its own history. A tool result that's a paragraph of text costs the same whether it's read once or carried for ten more turns — a few hundred tokens is a rounding error at any position in the conversation. A tool result that's an image doesn't get that pass. Screenshot one gets billed on turn one. Then it gets billed again on turn two, sitting in context unread while the model reasons about screenshot two. By turn ten, nine stale screenshots the model isn't looking at anymore are still costing tokens on every single call, and the growth is roughly quadratic in turn count instead of linear.

Text tool results have this same shape in theory, but in practice they're small enough that nobody notices. Images are two orders of magnitude larger per result, so the same architectural sloppiness that's invisible for a JSON blob is a line item for a screenshot.

## Only the current image needs to be an image

The fix isn't to stop taking screenshots — it's to stop letting old ones ride along as full-resolution payloads. Keep the most recent one or two images live in context, since those are the ones the model is actually reasoning about. Replace everything older with a text description and a pointer:

```python
def build_messages(history: list[dict], keep_images: int = 2) -> list[dict]:
    image_positions = [i for i, m in enumerate(history) if m.get("type") == "image"]
    stale = set(image_positions[:-keep_images]) if len(image_positions) > keep_images else set()

    out = []
    for i, msg in enumerate(history):
        if i in stale:
            out.append({
                "type": "text",
                "text": f"[screenshot at step {i}, replaced by caption: {msg['caption']}]",
            })
        else:
            out.append(msg)
    return out
```

The `caption` field is the part that has to exist before this works — generate a one-line description of what the screenshot showed at the moment you capture it ("checkout page, cart total $84.20, no coupon field visible"), not after the fact when you're demoting it. Demoting an image you never described just deletes information; demoting one you already captioned turns a 1,200-token image into an 15-token sentence that still tells the model what happened at that step.

## Where this breaks

Don't apply a blanket age cutoff without checking whether the task ever needs to look back. A visual diff task — "did this element move between step 3 and step 9" — genuinely needs both images live simultaneously, and captioning step 3 away before step 9 happens loses the exact comparison the agent was asked to make. Detect this from the task type, not from a fixed window: if the agent's job involves comparing states across time, keep the specific images the comparison needs, not just the most recent N.

The same principle applies to PDFs and rendered charts passed as images — anything where the tool result's byte size dwarfs its text-equivalent. If your agent loop wasn't built multimodal from day one, this is the one line item worth checking before you assume a slow, expensive run is a reasoning problem. Half the time it's context hygiene, and context hygiene is the cheaper fix.
