---
title: "Compact your agent's context before it fills up"
date: "2026-06-07"
summary: "Long-running agents accumulate context until they silently degrade or hard-error — proactive compaction is the fix, and the trigger point matters more than you think."
tags: ["agents", "reliability", "context"]
status: published
author: "Bharath"
---

Long-running agents have a slow-moving failure mode that doesn't announce itself: they fill their context window. Tool results pile up, reasoning traces accumulate, intermediate steps from 20 iterations ago are still in the messages array. Eventually one of three things happens — the API throws a context limit error, the model starts ignoring early messages, or your bill gets large for tokens that do nothing. None of these is the failure you were testing for.

The naive response is to truncate old messages. Drop the first N turns, keep the recent ones. This feels safe until you realize what you've deleted: the decisions the agent already made, the tools it already tried, the dead ends it ruled out. Truncation doesn't slim down the context — it gives the agent amnesia.

## The pattern: proactive compaction

The correct move is to periodically ask the agent to summarize its own state, then restart from that summary. You're converting verbose execution history into dense, structured knowledge. The agent keeps everything relevant; you shed the scaffolding.

```python
COMPACTION_THRESHOLD = 0.75  # trigger before hitting the wall

def maybe_compact(messages, system_prompt, model):
    if token_count(messages) / context_limit(model) < COMPACTION_THRESHOLD:
        return messages

    summary = client.messages.create(
        model=model,
        system=system_prompt,
        messages=messages + [{
            "role": "user",
            "content": (
                "Summarize your current state for context compaction. Include: "
                "decisions made and why, key facts discovered, approaches ruled out, "
                "and your immediate next step. Be exhaustive on facts, terse on process."
            )
        }]
    ).content[0].text

    return [{
        "role": "user",
        "content": f"[Context compacted at step N]\n\n{summary}\n\nContinue."
    }]
```

Call `maybe_compact` at the top of your agent loop, before each LLM call. Most iterations it's a fast token-count check and a no-op.

## Three things that matter

**Compact at 75%, not 95%.** You need room for the compaction call itself — a full summary of a full context doesn't fit in a full context. Trigger early. I use 75% as a rule of thumb; adjust based on how verbose your agent's summaries tend to run.

**Never summarize the system prompt.** Your system prompt contains the agent's instructions, tool definitions, and constraints. Keep it verbatim. Only the messages array gets compacted. Agents that summarize their own instructions into the conversation turn fuzzy on their constraints surprisingly fast.

**Tell the agent it's been compacted.** The `[Context compacted at step N]` label in the new user message isn't cosmetic — it signals to the model that prior reasoning isn't available for reference, which prevents it from confidently hallucinating things it supposedly concluded earlier.

## What good summaries look like

The summary prompt above asks for decisions, facts, ruled-out paths, and next step. This structure matters. An agent that only summarizes conclusions will loop back to approaches it already tried. One that includes dead ends and why they failed won't.

You can also give the agent a schema for the summary — a short JSON structure it fills in — which makes compaction deterministic enough to test. If the structured summary is missing a key field, you catch it before the agent continues on degraded state.

Proactive compaction is one of those patterns that feels like overhead until the first time it saves a 40-step run from silently restarting from scratch.
