---
title: "A Compacted Summary Can Invent the Resolution It Was Supposed to Preserve"
date: "2026-11-27"
summary: "Compaction's job is to produce coherent prose, and an unresolved debate compresses worse than a decision — so it quietly becomes one."
tags: ["agents", "context", "reliability"]
status: draft
author: "Bharath"
---

## The migration that got decided by a summarizer

A coding agent was three hours into a session: scaffold the service, wire up the database layer, write the tests. Early on, the user had flagged an open question — "not sure if we want Postgres or SQLite for this, let's decide once we see the write volume" — and the agent kept going on other work without resolving it. Context filled up. The session's compaction step ran, summarized the first two hours into a paragraph, and dropped the raw messages.

The summary read: "Database: SQLite." Not a lie exactly — SQLite had been mentioned, in a sentence about *not yet choosing* it. But a one-line summary doesn't have room for "leaning toward, pending write-volume data," so the compaction model wrote the cleaner sentence instead. The agent spent the next hour building migrations and a connection pool around SQLite. Nobody caught it until the user asked why there was a `schema.sql` file for a database they hadn't agreed to.

## Why the summarizer reaches for the clean version

Compaction is itself a model call, and that call is optimized the same way any generation is: toward coherent, confident prose. "The team debated Postgres versus SQLite and hadn't settled, pending write-volume numbers" is a worse sentence by every metric a language model is trained to care about than "The team chose SQLite." It's longer, hedgier, and harder to follow. Given a choice between preserving an unresolved thread faithfully and tidying it into a decision, the model doesn't experience that as a choice — it experiences it as writing a better paragraph.

The result doesn't look like an error. It reads exactly like every other sentence in the summary, with the same confident register as facts that actually happened. There's no marker distinguishing "this was stated" from "this was resolved by the paraphrase." Once it's in context, the agent has no way to tell the difference either.

## Force open questions into their own field

Don't let compaction produce a single prose blob. Give it a schema that separates settled facts from anything still pending, so there's no sentence-level pressure to merge the two:

```python
COMPACTION_SCHEMA = {
    "facts": "list[str] — only things explicitly stated or confirmed",
    "open_questions": "list[str] — anything raised but not resolved, verbatim",
    "decisions_pending_on": "list[str] — what's blocking each open question",
}
```

An unresolved thread now has to land in `open_questions`, where it stays visibly unresolved instead of getting smoothed into `facts` for the sake of a tidier paragraph. The compaction prompt should say explicitly: if you're not sure whether something was decided, it goes in `open_questions`, not `facts`.

## The tell

Any time an agent takes a consequential, hard-to-reverse action shortly after a compaction event in a long session, ask whether you can point to the actual turn where that fact was established. If the only evidence is a sentence in a summary, and the sentence is tidier than you'd expect a real conversation to be, that tidiness is the bug. Real decisions are messy enough to have conditions attached. Clean ones are usually compaction's.
