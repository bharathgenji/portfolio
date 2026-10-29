---
title: "Context Editing Clears the Request, Not Your Transcript"
date: "2026-10-29"
summary: "Turn on automatic context editing and the triggering call gets lighter — but if your stored history is still the uncompacted one, you're paying to re-clear the same bloat every single turn."
tags: ["agents", "context-management", "cost"]
status: draft
author: "Bharath"
---

## The dashboard that didn't move

A team turns on context editing — the API-side feature that automatically strips old `tool_use`/`tool_result` content once a token threshold trips — tests it, watches the triggering call come back lighter, and ships it. A week later the cost dashboard hasn't budged. The feature is doing exactly what it says. It's just not doing it where they assumed.

## Why the savings don't compound

Context editing runs against the message list you send in *that one request*. The API clears old tool content before it reasons, counts tokens, and returns a response — plus a record of what it cleared. What it doesn't do is reach into your database and edit the conversation you have stored. Your application's source of truth is whatever messages array you assemble for the next call, and unless you write the edited version back into that store, you build the next request from the same full, uncompacted history you always had. The API dutifully re-clears the same bloat on the next turn, and the one after that, spending tokens on the clearing operation itself without ever banking the savings.

This is the same mistake as [[compact-agent-context-mid-run]], one layer removed. Manual compaction fails if you forget to replace your messages array with the summary. Automatic context editing fails for the identical reason — it's just easier to miss, because the feature *looks* like it owns persistence. It doesn't. It owns clearing, once, for the request in front of it.

## Write the edited result back

```python
response = client.messages.create(
    model=model,
    messages=messages,
    tools=tools,
    context_management={
        "edits": [{"type": "clear_tool_uses_20250919", "keep": {"type": "tool_uses", "value": 3}}]
    },
)

if response.context_management and response.context_management.applied_edits:
    messages = apply_clears(messages, response.context_management.applied_edits)
```

`apply_clears` has to mutate your stored history to match what the API actually reasoned over — swap in whatever placeholder the response indicates for the cleared blocks, don't just log the edit and move on. Skip this step and you've built a feature that spends tokens shrinking a request, then discards the shrinkage before the next call ever sees it.

## Watch the cache, not just the token count

Clearing anything out of the middle of your history invalidates the prompt cache for every token after the cut point ([[cache-your-prompt-prefix]]). An edit that fires every few turns can cost you more in lost cache hits than it saves in cleared tool output, especially on a long-running agent where that prefix was previously staying warm. Check both numbers before trusting the threshold — a smaller request that now misses cache isn't automatically a win.

## The rule

Context editing is a per-request operation; persistence is still your job. If the cost graph doesn't move after you turn it on, check whether the edited history is actually making it into your next call before you conclude the feature doesn't work.
