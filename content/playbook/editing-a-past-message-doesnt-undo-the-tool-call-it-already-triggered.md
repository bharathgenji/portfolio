---
title: "Editing a Past Message Doesn't Undo the Tool Call It Already Triggered"
date: "2026-11-23"
summary: "Edit-and-regenerate forks the conversation tree, but the email the abandoned branch already sent is still sent."
tags: ["agents", "state-management", "reliability"]
status: draft
author: "Bharath"
---

## The UX feature that looks purely cosmetic

Your chat product lets a user edit an earlier message and regenerate from there — a standard feature, and a reasonable one. Under the hood it's not a replacement, it's a fork: the same `conversation_id` now has two paths through the message tree, the original and the edited one. The UI only shows the new path, so it looks like the old one was deleted. It wasn't. It's still sitting in your transcript store, and if your agent is more than a chatbot, it already *did things* along that path before the user edited anything.

## The side effects didn't get the memo

Say turn 3 of the original branch called a tool that sent a confirmation email, filed a ticket, or charged a card. The user then edits turn 2 — maybe just rewording a question — and regenerates. Turn 3 never happens on the new branch. From the model's point of view, and from the UI's point of view, that tool call doesn't exist anymore. From the email provider's point of view, it was sent four seconds ago and is sitting in someone's inbox right now.

Editing a message changes which context the model sees going forward. It does not reach backward in time and revoke an API call that already returned 200. If the action was irreversible, you need [[give-agent-actions-a-compensating-action]] fired specifically when a branch gets abandoned — not just when a run fails — because an edit *is* an abandonment, just one your orchestration code probably isn't watching for.

## Branch-scoped state keeps leaking into the wrong branch

The quieter bug is state you keyed by `conversation_id` instead of by the node in the message tree. Token budgets, loop-detector counters, per-conversation rate limits — anything accumulated "for this conversation" — doesn't know a fork happened, so spend from the abandoned branch keeps counting against the branch the user is actually on:

```python
# wrong: both branches drain the same bucket
budget = get_budget(conversation_id)

# right: each branch pays for its own tool calls
budget = get_budget(conversation_id, branch_id=current_leaf_message_id)
```

A user who edits a message three times while iterating on a prompt can watch their [[give-every-agent-run-a-token-budget]] budget or [[add-a-loop-detector-to-every-agent]] counter trip from spend that happened on paths they never see — the abandoned branches, silently billing the one they're looking at.

## What to actually scope per branch

Key every piece of run-scoped state — budgets, rate-limit counts, loop-detector state, idempotency keys for in-flight writes — by the current leaf node in the message tree, not the conversation as a whole. When a user edits a message, walk the old branch's completed tool calls and decide, per call, whether it needs a compensating action now rather than waiting for a terminal failure that will never come, because that branch just stopped executing. And if a tool call is genuinely irreversible — a sent email, a posted message, a non-refundable charge — put a confirmation gate in front of it on *any* branch, since you can't compensate your way out of some of these after the fact, edit or no edit.

The conversation tree abstraction is correct and the UX win is real. The mistake is assuming "the user can't see that branch anymore" means "that branch stopped having consequences."
