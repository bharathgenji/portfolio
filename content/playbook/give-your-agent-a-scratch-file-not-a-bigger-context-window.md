---
title: "Give Your Agent a Scratch File, Not a Bigger Context Window"
date: "2026-08-02"
summary: "Compaction decides what to discard from context — the better fix is making sure large artifacts never enter context at all."
tags: ["agents", "context", "architecture"]
status: draft
author: "Bharath"
---

A research agent spends 12 steps gathering data: API responses, scraped pages, draft tables. By step 13 it needs to write a report referencing all of it. The naive design keeps every artifact in the messages array, so the model re-reads 40,000 tokens of raw material on every subsequent turn just to stay "aware" of what it collected. Compact that context and you lose fidelity — the compacted summary paraphrases the exact numbers the report needs to cite verbatim. Don't compact it and you burn tokens and latency on every step for data the model isn't touching that turn.

Both options are wrong because they start from the same assumption: that everything the agent produces has to live in context. It doesn't.

## Write it out, hand back a pointer

When a tool call or reasoning step produces something larger than a couple hundred tokens — a scraped page, a query result, a drafted section — write it to a file or blob store and return a handle, not the content.

```python
def save_artifact(content: str, label: str) -> dict:
    artifact_id = uuid4().hex[:8]
    path = f"/scratch/{run_id}/{artifact_id}.txt"
    blob_store.write(path, content)
    return {
        "artifact_id": artifact_id,
        "path": path,
        "label": label,
        "preview": content[:200],
        "size_chars": len(content),
    }
```

The agent's context now holds `{artifact_id, label, preview, size_chars}` — maybe 60 tokens — instead of the full artifact. When it actually needs the content, it calls `read_artifact(artifact_id)`, and that content enters context exactly once, exactly when it's used, exactly as it was originally written. No paraphrasing, no lossy re-summarization, no re-reading it on turns that don't need it.

## Give it an index, not a dump

The failure mode people hit immediately: they solve the content problem and recreate it with the index. If `list_artifacts()` returns full previews for 40 saved files, you've just moved the bloat one level up. Keep the index itself terse — id, one-line label, size — and let the agent fetch full content only for the specific artifact it needs to quote or inspect.

## Where this beats compaction outright

Compaction is the right tool when the *value* is in the model's evolving understanding — decisions made, paths ruled out, current plan. Prose summarizes well there because the content is naturally soft.

Scratchpad files are the right tool when the value is in the *exact bytes* — a SQL query the report cites, a customer's original message, a code diff another agent needs to apply verbatim. Summarizing those isn't lossy compression, it's corruption: a paraphrased SQL query is a different, probably broken, SQL query.

Run both in the same agent. Compact the reasoning trace on the normal cadence. Route anything factual and reusable through the scratchpad from the moment it's created, so it never has to survive a compaction pass in the first place.

## The cleanup you'll forget

Scratch files outlive the run unless something deletes them. Tie a TTL or an explicit cleanup step to run completion — cheap in blob storage, and it keeps you from debugging a "why does this agent see stale data" bug that's actually a directory full of last month's artifacts.
