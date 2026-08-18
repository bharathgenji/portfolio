---
title: "An Appended Correction Doesn't Undo the Original Claim"
date: "2026-08-18"
summary: "Tell an agent 'that number was wrong' and the wrong number is still sitting in context, still shaped like an answer — and it keeps citing it anyway."
tags: ["agents", "context", "reliability"]
status: published
author: "Bharath"
---

A research agent calls a tool, misreads the result, and states a wrong figure — a revenue number, a row count, a date. Three turns later a user or a validator says "that's wrong, the actual number is X." The agent apologizes, restates the correct number, and keeps going. Then, five turns after that, in a summary or a follow-up calculation, the wrong number resurfaces. Not because the model forgot the correction — the correction is right there in the transcript — but because the original claim is *also* right there, stated once as a confident, fully-formed assertion, and appended text doesn't have the weight to displace it.

This is different from the compounding-error problem [[fan-out-multiplies-failure-not-just-cost]] describes, where independent steps multiply toward failure. Here there's one bad fact and one visible correction, and the correction still loses. The reason is structural: the model attends over the whole transcript, and a clean declarative sentence ("Revenue was $4.2M") reads as more authoritative than a correction wrapped in the softer language people actually use to correct things ("Sorry, that's wrong — it's actually $3.1M"). The retraction is semantically present but not structurally dominant. On a long transcript, especially after [[compact-agent-context-mid-run]] summarizes the middle, the correction is exactly the kind of hedge-y, second-order statement a summarizer trims first, because it reads as commentary on the fact rather than the fact itself.

## Don't correct in place — replace in place

If your harness lets you edit message history before the next call (most agent loops that own their own message array do), don't append the fix as a new turn. Overwrite the offending message.

```python
def apply_correction(messages: list[dict], turn_index: int, corrected_text: str) -> list[dict]:
    messages[turn_index] = {
        **messages[turn_index],
        "content": corrected_text,
        "correction_note": "superseded — original claim removed, do not re-derive",
    }
    return messages
```

The wrong number never gets a second chance to be read as ground truth, because it no longer exists as a standalone assertion in the transcript. There's one number in context, and it's the right one. This only works for facts your harness produced or can definitively verify — don't silently rewrite a user's own message, since that's a different and worse problem than the one you're solving.

## When you can't edit history, mark the retraction as load-bearing

Some transports genuinely can't do in-place edits — you're appending to an immutable log, or the correction comes from a downstream system after the turn is already committed elsewhere. In that case, don't phrase the correction as commentary. Phrase it as the fact, restated as if the original had never been said, with the wrong value flagged as explicitly invalid rather than merely disagreed with:

```
CORRECTION — the earlier figure is invalid, not just disputed:
Revenue for Q3 = $3.1M. Do not use $4.2M anywhere downstream, including in
summaries, calculations, or citations. Treat this message as replacing
message #14 in full.
```

The difference from a natural apology isn't tone, it's that this version gives the model an explicit instruction about what to do with the old value, instead of trusting it to infer that a correction implies deletion.

## Check for this specifically in your evals

A judge that only checks "is the final answer correct" won't catch this, because the final answer can be correct while an intermediate step silently used the stale figure and got lucky, or wrong while looking like a normal model error instead of a retraction failure. Add a narrow eval: inject a wrong fact at turn N, inject a correction at turn N+2, then check every turn after N+2 that references the fact — not just the last one — for which value it used. This is the same instinct as [[freeze-tool-responses-in-evals]]: you're not testing whether the agent can get the right answer, you're testing whether a specific, previously-observed failure mode is closed, which a generic end-to-end eval will not tell you.
