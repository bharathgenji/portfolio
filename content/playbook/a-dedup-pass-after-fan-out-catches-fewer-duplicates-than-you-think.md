---
title: "A Dedup Pass After Fan-Out Catches Fewer Duplicates Than You Think"
date: "2026-11-21"
summary: "Six parallel bug-finders surface the same race condition under three different names, and your file-and-line dedup lets all three through."
tags: ["agents", "multi-agent", "reliability"]
status: draft
author: "Bharath"
---

## The same bug, three write-ups

A security-review workflow fans out six finder agents over a diff, each one blind to the others on purpose — that isolation is what makes them search differently instead of converging on the same three obvious spots. All six come back. A dedup step keys on `(file, line)` and drops exact matches, then the survivors go to an expensive adversarial-verify pass. Three "distinct" findings show up afterward, all describing the same missing-await race in the webhook handler: one anchored on the line that calls the handler, one on the line that mutates shared state, one on the line eight frames away where the un-awaited promise actually resolves. Three different `(file, line)` keys, one bug, three rounds of verify budget spent confirming it, and — if nobody catches it — three line items in the final report.

## Why the key-based dedup misses it

`(file, line)` dedup only catches finders that happened to point at the identical line. It was never designed to catch finders that describe the same root cause from different vantage points, and most real bugs have more than one defensible anchor line. Switching to a semantic dedup — embed each finding's summary, drop near-neighbors — moves the problem rather than fixing it: now you're trusting an embedding model's notion of "similar enough," and two summaries that describe the same bug in different technical vocabulary ("race condition on shared state" vs. "unawaited promise resolves after caller returns") can sit well outside whatever cosine threshold you picked. Post-hoc dedup, by key or by embedding, is a recall problem wearing a cleanup step, and recall problems don't get easier after the fact — you're deduping against descriptions, not against the bug itself.

## Claim before you write up, not after

The fix is upstream: before a finder commits to investigating something, have it post a cheap, narrow claim — not its finding, just the locus it's about to dig into — to a shared list the other finders can check.

```python
def claim(locus: str, finder_id: str, claims: list[dict]) -> bool:
    if any(overlaps(locus, c["locus"]) for c in claims):
        return False  # someone's already on this, skip it
    claims.append({"locus": locus, "finder_id": finder_id})
    return True
```

`overlaps` needs to be coarser than a line number — a function name, a symbol, a call chain — or claims never collide on the real duplicates, which recreates the exact problem you're trying to avoid. Too coarse ("the webhook module") and finders start blocking each other on work that was never actually the same. Tune the granularity to how wide your bugs actually spread, not to what's easy to hash.

## Where post-hoc dedup is still fine

If your finders are assigned genuinely disjoint territory — one per file, one per subsystem — there's no overlap to claim against, and a dedup pass is just a safety net for the rare edge case, not your primary defense. Claiming earns its cost when finders search freely and are *expected* to converge, which is most "find anything you can" fan-outs by design.
