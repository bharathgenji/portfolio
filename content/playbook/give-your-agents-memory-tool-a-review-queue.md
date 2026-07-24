---
title: "Give Your Agent's Memory Tool a Review Queue"
date: "2026-07-18"
summary: "A wrong fact in the context window disappears when the session ends. A wrong fact in long-term memory gets retrieved as ground truth forever — until you build a way to catch it."
tags: ["agents", "memory", "reliability"]
status: published
author: "Bharath"
---

Give an agent a `write_memory` tool and it will use it exactly as often as you'd hope — that's the problem. It infers a preference from one ambiguous message, writes it down as fact, and never revisits it. Six weeks later a scheduling agent is booking every meeting at 9am Pacific because a user once said "let's do morning" in a thread that never specified timezone, and the model guessed PST, wrote it to memory, and moved on.

The failure mode is specific to memory, not context. A wrong inference inside a conversation is fragile — it gets re-examined, contradicted, or simply expires when the session ends. A wrong inference written to persistent memory is durable. It gets retrieved in a future session, formatted as a clean bullet point ("User prefers morning meetings, PST"), and handed to the model with the same authority as a fact the user stated directly. The model trusts it *more* the second time, because guesses read identically to confirmed facts once they're in storage.

## Separate "stated" from "inferred" at write time

The fix starts with provenance, not confidence scores. Every memory write needs a source tag:

```python
def write_memory(user_id: str, fact: str, source: str, evidence: str):
    assert source in ("stated", "inferred")
    memory_store.insert({
        "user_id": user_id,
        "fact": fact,
        "source": source,          # did the user say this, or did we guess?
        "evidence": evidence,      # the message that justified the write
        "status": "confirmed" if source == "stated" else "pending",
        "corroborations": 1,
    })
```

Anything the user said outright — "I'm in Chicago" — writes as `confirmed` immediately. Anything the model inferred writes as `pending` and doesn't get surfaced to future sessions with the same weight. Retrieval formats the two differently: `"User is in Chicago (stated 2026-06-02)"` versus `"User may prefer morning meetings (inferred, unconfirmed)"`. The second phrasing gives the model in the next session permission to double-check instead of building on a guess as if it were bedrock.

## Promote inferred facts on corroboration, not on a timer

Don't auto-confirm pending memories after some arbitrary interval — that just delays the same bug. Promote them when the same inference shows up independently across separate sessions, or when the user confirms it directly:

```python
def reinforce_or_confirm(existing, new_evidence):
    if new_evidence.corroborates(existing.fact):
        existing.corroborations += 1
        if existing.corroborations >= 3:
            existing.status = "confirmed"
    return existing
```

Three independent signals pointing the same direction is a real pattern. One offhand remark is not.

## Namespace before anything else

None of this matters if memory writes aren't scoped to the user or tenant that produced them. This is the one bug in this space that isn't subtle — memory keyed loosely enough that user A's session pulls in user B's stored facts is a data leak, not a quality issue, and it's worth a dedicated integration test that asserts cross-tenant retrieval returns nothing, every time you touch the memory layer.

Memory is a write path into what your agent will believe next week. Review it like one.
