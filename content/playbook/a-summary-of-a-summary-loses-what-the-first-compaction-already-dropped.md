---
title: "A Summary of a Summary Loses What the First Compaction Already Dropped"
date: "2026-09-20"
summary: "Compaction is safe once — but wire it to summarize its own prior summary and a long-running agent slowly forgets things it never got a second chance to keep."
tags: ["agents", "reliability", "context"]
status: draft
author: "Bharath"
---

## The run that forgot why it made a decision

An agent doing a multi-day data migration compacted its context every few hours, same as [[compact-agent-context-mid-run]] recommends — summarize state, restart from the summary, keep going. Individually, each compaction looked fine: reasonable length, plausible facts, a clear next step. Four compactions in, the agent re-ran a migration step it had already completed, because the reason it had skipped that table — a data-quality issue flagged four summaries back — never made it past the second compaction. Nobody had lied to the model. Each summary was an honest, faithful compression of what it was given. What it was given, by the third round, was a summary of a summary of a summary.

## Compaction isn't lossless, and loss compounds

A single compaction is a reasonable trade: you exchange verbose tool traces for a dense recap, and the recap is built from the full raw context, so anything genuinely important has a real chance of surviving. The second compaction is a different operation even though it looks identical in your code. It isn't summarizing the raw transcript anymore — it's summarizing the *first summary plus whatever's happened since*. Anything the first summary trimmed as low-priority is already gone; the second compaction can't recover it, only compress what remains. Do this five or six times over a long-running agent and you get the LLM equivalent of a photocopy of a photocopy — each generation looks locally coherent and is measurably farther from the source.

The failure is quiet because every individual compaction passes a spot check. You only see the drift by comparing summary N against the original transcript, which is exactly the comparison nobody runs in production.

## Keep an append-only ledger outside the summary loop

Don't let compaction N+1 read compaction N's prose as its only source. Maintain a separate, append-only fact ledger — structured entries, not narrative — that every compaction writes into but never rewrites:

```python
def compact(messages, ledger):
    summary = summarize(messages)          # dense recap of this window only
    ledger.append({                        # never summarized, never rewritten
        "step": ledger.next_id(),
        "decisions": extract_decisions(messages),
        "facts": extract_facts(messages),
    })
    return [
        {"role": "user", "content": render_ledger(ledger) + "\n\n" + summary}
    ], ledger
```

`render_ledger` can still truncate for length, but it truncates by dropping whole entries — old, superseded decisions — not by re-summarizing surviving ones into vaguer prose. A decision either stays intact or gets pruned deliberately; it never degrades by attrition.

## What to check

If your agent runs long enough to compact more than once, log the compaction count per run and spot-check any run past three or four. Ask specifically: does the current state still contain the *reasons* behind early decisions, or just the decisions themselves? Reasons are what silently evaporate first, and they're exactly what the agent needs to avoid redoing work it already ruled out.
