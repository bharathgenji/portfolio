---
title: "A Stale Read Doesn't Know the File Changed Underneath It"
date: "2026-10-02"
summary: "A coding agent's edit tool trusts the text it read ten steps ago — and nothing stops it from writing a correct-looking diff into a file that's already moved on."
tags: ["agents", "tool-design", "concurrency"]
status: draft
author: "Bharath"
---

## The edit that was right when it was planned

A coding agent reads `config.py` at step 4 to find a flag to flip, spends the next eight steps running tests and reading other files, then calls `edit(old_string, new_string)` against the text it saw at step 4. In between, a pre-commit hook reformatted the file, or a teammate pushed a change the agent's branch picked up on a background `git pull`, or — in a multi-agent setup — a second agent touched the same file to fix an unrelated import. The `old_string` the agent is holding no longer describes the file on disk. It describes the file as it existed at the moment of the read, which by step 12 is a historical document, not a current one.

Two outcomes follow, and only one of them is safe. If `old_string` no longer appears anywhere in the file, a well-built edit tool rejects the call loudly — annoying, but correct, because the agent gets a chance to re-read and retry. The dangerous case is when the file changed in a way that leaves a similar-looking string intact elsewhere, or when the tool does a loose match instead of an exact one. The edit lands, the tool reports success, and the agent moves on having silently overwritten whatever change happened in the gap.

## Exact-match isn't the same as fresh-match

Most people reach for "require the old string to match exactly, and fail if it's not unique" and call the staleness problem solved. It isn't. Exact-match protects you from ambiguity within the file's current content — it says nothing about whether that content is the one the agent's plan was actually built against. A file can change twice between a read and a write and still contain an exact, unique match for text that's now sitting in the wrong surrounding context, because the match check only ever looks at the string you're replacing, never at whether the file as a whole is the file you think it is.

## Check the whole file, not just the substring

The fix is a version check, the same optimistic-concurrency pattern you'd use for a database row:

```python
def read_file(path: str) -> dict:
    content = fs.read(path)
    return {"content": content, "fingerprint": sha256(content)}

def edit_file(path: str, old_string: str, new_string: str, expected_fingerprint: str):
    current = fs.read(path)
    if sha256(current) != expected_fingerprint:
        raise StaleReadError(
            f"{path} changed since it was last read — re-read before editing"
        )
    if current.count(old_string) != 1:
        raise AmbiguousMatchError(f"old_string is not unique in {path}")
    fs.write(path, current.replace(old_string, new_string))
```

The agent carries `fingerprint` forward from its own read, the same way it carries any other tool output. A mismatch means exactly one thing — something touched the file after the agent's mental model of it was formed — and the recovery is always the same: re-read, re-plan the diff against current content, retry.

## Where this actually bites

Single-agent, single-file, no background processes: you'll likely never see this. It shows up the moment any of those assumptions breaks — parallel agents sharing a worktree, CI or formatters running against the same checkout, a human in the loop editing alongside the agent, or just a long enough gap between read and write that something else got scheduled. Add the fingerprint check before you need it, not after a diff lands somewhere it shouldn't.
