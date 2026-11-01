---
title: "A Thinking Signature Doesn't Transfer to the Model You Failed Over To"
date: "2026-11-01"
summary: "Extended thinking blocks carry a signature tied to the model that produced them, so a mid-conversation fallback to a different model doesn't degrade gracefully — it throws."
tags: ["agents", "thinking", "fallback"]
status: draft
author: "Bharath"
---

## The fallback that worked in every test except the one that mattered

A team running an agent with extended thinking enabled had a standard fallback chain: primary model, and if that errors or times out, drop to a secondary model to finish the run. They tested it by killing the primary mid-request and watching the secondary pick up cleanly. It did — on turns with no thinking history yet. The first time the fallback fired on turn four of a real conversation, one that already had a thinking block sitting in the transcript from turn two, the secondary model's call came back with a 400 and the run died anyway. The fallback they built for reliability turned into a second failure mode.

## Why the swap, not the model, is the problem

A thinking block isn't just text the model produced — it ships with a signature the API uses to verify that block hasn't been tampered with before you hand it back on a later turn. That verification is scoped to the model that generated it. Replay the exact same block to the exact same model and it checks out. Replay it to a different model — your fallback, a cheaper model you're routing simple turns to, a canary you're shadow-testing — and the signature doesn't validate, because it was never signed for that model in the first place. The API doesn't quietly drop the block and move on; it rejects the request.

This is easy to miss in testing because most fallback drills happen on turn one, before any thinking block exists to carry forward. The bug only shows up once a real conversation has accumulated history, which is exactly the shape of traffic your fallback is supposed to protect.

## The fix: strip thinking before you hand the transcript to a different model

Any thinking block becomes dead weight the moment it's about to be replayed to a model that didn't produce it. Filter it out at the handoff boundary, not deeper in your message-building code where it's easy to forget:

```python
def for_model(messages: list[dict], target_model: str, produced_by: str) -> list[dict]:
    if target_model == produced_by:
        return messages
    return [
        {**m, "content": [b for b in m["content"] if b.get("type") != "thinking"]}
        if m["role"] == "assistant" else m
        for m in messages
    ]
```

You lose the reasoning trace, not the answer — the text and tool-call blocks that came out of that thinking survive untouched, so the fallback model still has the conversation's actual content to work from. It just starts reasoning fresh instead of continuing someone else's chain of thought it was never shown signing for.

## The rule

Any place your routing logic can send turn N to a different model than turn N-1 — fallback, cost-based routing, canary traffic, A/B tests — needs this filter at the switch point. [[thinking-blocks-travel-with-their-tool-call]] covers keeping a thinking block glued to its own turn; this is the corollary for when the turn after it lands on a different model entirely. Treat "same model" as a precondition for replaying thinking, not an assumption your fallback path gets to skip checking.
