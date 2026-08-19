---
title: "Give Your Agent an Edit Tool, Not a Rewrite Tool"
date: "2026-08-19"
summary: "A write_file tool makes your agent retype every line of a file it barely touched — and past a few hundred lines, it starts quietly dropping the ones it didn't mean to change."
tags: ["agents", "tool-design", "reliability"]
status: published
author: "Bharath"
---

## The bug that looks like a successful write

An agent fixes one function in a 900-line file. Its only tool is `write_file(path, contents)` — pass the full file back, disk overwrites it. The call succeeds, the diff in your CI looks reasonable at a glance, and three files down the same PR, a docstring two hundred lines from the edit has vanished. Not changed — gone. Nobody touched it in the prompt. The model just didn't reproduce it faithfully on the way back out.

This isn't a one-off hallucination. It's a structural property of the tool. `write_file` asks the model to hold the entire file in working memory and retype it byte-for-byte, including the 897 lines nobody asked it to think about. Verbatim reproduction over long spans is exactly the kind of task transformers are worst at — the same failure mode as "repeat this document back to me exactly," which degrades well before the file hits your context limit. And because the tool call still returns success, nothing flags it. The file exists, it's syntactically valid, it's just quietly wrong somewhere you weren't looking.

## Make the tool touch only what changed

Give the agent an edit primitive instead: it names the exact span it wants replaced, and your code applies that patch to the file on disk. The model never has to hold or retype the untouched 99% of the file.

```python
def edit_file(path: str, old_string: str, new_string: str) -> dict:
    content = read(path)
    matches = content.count(old_string)
    if matches == 0:
        return {"error": "old_string not found — file may have changed, re-read it"}
    if matches > 1:
        return {"error": f"old_string is not unique ({matches} matches) — include more context"}
    write(path, content.replace(old_string, new_string, 1))
    return {"status": "ok"}
```

Two failure branches matter more than the happy path. Reject a non-unique match rather than guessing which occurrence was meant — a silent wrong-occurrence edit is the same class of bug as the vanishing docstring, just smaller. Reject a zero match rather than falling back to append or fuzzy-match — it usually means the model's view of the file is stale, and applying a patch against stale context corrupts state as reliably as a bad merge.

## Reserve the rewrite tool for actual rewrites

Don't remove `write_file` — creating a new file, or genuinely regenerating one from scratch, is still its job. Scope it there, the same way you'd scope any tool to the phase where it's safe ([[scope-tools-to-the-current-phase]]). What you're removing is the default path where an agent reaches for "overwrite everything" to make a three-line change, because that's the only tool you gave it.

## The tell

If your agent's diffs are consistently larger than the change it describes, that's not a smarter model needed — it's a tool design bug. An edit tool doesn't just save tokens. It makes "what changed" match "what the model meant to change," which a full-file rewrite can only promise on days the file is short enough to hold exactly.
