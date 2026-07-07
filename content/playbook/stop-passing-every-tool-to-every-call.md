---
title: "Stop Passing Every Tool to Every Call"
date: "2026-07-07"
summary: "Past a few dozen tools, accuracy drops and tokens balloon — the fix isn't a leaner tool set, it's retrieving the right subset per turn instead of shipping all of them every time."
tags: ["agents", "tools", "cost"]
status: draft
author: "Bharath"
---

## The tool list is a prompt, and prompts have a saturation point

Every tool schema you pass to the model gets tokenized, read, and weighed against every other tool schema before the model picks one. At ten tools this costs nothing. At forty, you start paying for it twice: once in tokens — a fully-described tool with parameters and a decent description easily runs 100-200 tokens, so eighty tools is a five-figure token tax before the conversation even starts — and once in accuracy, because the model now has to disambiguate between `update_ticket` and `update_ticket_status` and `patch_ticket_fields` on every single call, and it will occasionally pick wrong even when the task is unambiguous to a human.

This isn't a hypothetical. Teams building agents against a broad internal tool library — CRM actions, ticketing, deploy scripts, internal search — routinely cross fifty or a hundred tools within a few months. The instinct is to trim descriptions or merge tools to claw back tokens. That treats the symptom. The actual problem is architectural: you're statically deciding, at the start of every call, that all hundred tools are candidates for this turn, when in practice any given turn needs three to five of them.

## Retrieve tools the way you retrieve documents

If you already do RAG for documents, you have the pattern. Embed each tool's name and description once, offline. At request time, embed the user's message (or the agent's current sub-goal), pull the top-k nearest tools, and pass only those to the model.

```python
tool_index = build_index([
    {"name": t.name, "text": f"{t.name}: {t.description}", "schema": t.schema}
    for t in ALL_TOOLS
])

def tools_for_turn(query: str, k: int = 8) -> list[dict]:
    matches = tool_index.search(embed(query), top_k=k)
    return [m["schema"] for m in matches]
```

`k=8` is a starting point, not a rule — tune it against your eval set by sweeping k and watching both task success and token spend. Below the right k you start missing the correct tool; above it you're back to paying the tax you built this to avoid.

## Always include a fixed core

Don't retrieve everything. Tools the agent needs on nearly every turn — your `done` tool, a `think` tool, an `ask_human` escape hatch — belong in a small fixed set that's always present, with retrieval filling in the rest. Making even those searchable adds latency and a failure mode (a bad embedding match drops your kill switch from the list) for no benefit, since they're needed unconditionally anyway.

## Log misses, not just hits

The failure mode unique to this approach is silent: the right tool exists, but it didn't make the top-k, and the model either picks the closest wrong one or gives up. You won't see an error for this — you'll see a slightly-worse success rate that's hard to attribute. Log every turn's retrieved tool set alongside the tool actually called. If the called tool is outside the retrieved set (the model asked for something you didn't offer) or a human reviewer later says a different tool should have fired, that's your signal to raise k, improve the tool's description text, or add synonyms to its embedding input.

## When to bother

Below twenty or so tools, don't build this — pass the full set and spend your effort elsewhere. This pattern earns its complexity exactly where static tool lists stop working: broad internal platforms, multi-product agents, anywhere your tool count grows faster than any one task's actual needs.
