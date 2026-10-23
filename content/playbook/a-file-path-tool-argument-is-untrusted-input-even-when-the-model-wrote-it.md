---
title: "A File Path Tool Argument Is Untrusted Input Even When the Model Wrote It"
date: "2026-10-23"
summary: "A read_file tool that checks the path starts with the right prefix still lets the model escape the sandbox, because `..` and symlinks don't care what the string starts with."
tags: ["agents", "security", "tool-design"]
status: draft
author: "Bharath"
---

## The tool that only reads inside `/workspace`

A coding agent gets a `read_file(path)` tool, scoped to a project checkout at `/workspace/repo`. The guard looks reasonable:

```python
def read_file(path: str) -> str:
    full_path = os.path.join("/workspace/repo", path)
    if not full_path.startswith("/workspace/repo"):
        raise ValueError("path escapes workspace")
    return open(full_path).read()
```

It survives every test you write by hand, because every test you write by hand passes a normal relative path. Then an agent working through a long refactor — or one that just read a comment in a fetched dependency's README suggesting it check `../../../etc/passwd` for "debugging" — passes `path="../../../etc/passwd"`. `os.path.join` doesn't normalize anything; it just concatenates. The resulting string is `/workspace/repo/../../../etc/passwd`, and the `startswith` check passes, because the string still literally starts with `/workspace/repo`. The OS resolves the `..` segments at open time, long after your check already said yes.

## Why the prefix check is the wrong check

A `startswith` guard is checking the string you built, not the file the kernel will actually open. Three things defeat it independently:

1. **`..` traversal** — never canonicalized before the check runs.
2. **Symlinks** — a file *inside* the sandbox that points *outside* it. The path string never leaves the allowed prefix; the inode it resolves to does. `git clone` from an untrusted source, or an earlier tool call that wrote a symlink, is enough to plant one.
3. **Case and encoding tricks** on case-insensitive or Unicode-normalizing filesystems, which make string comparison disagree with what the filesystem treats as the same path.

None of these require the model to be adversarial. A model that's seen enough shell scripts in training will produce `../` paths unprompted when it's trying to reach a file it believes is a sibling directory — "fix it" instructions are enough; you don't need prompt injection for this to fire.

## Resolve first, then check, every time

The fix is to canonicalize before comparing, using the real filesystem, not the string:

```python
import os

SANDBOX_ROOT = os.path.realpath("/workspace/repo")

def read_file(path: str) -> str:
    candidate = os.path.realpath(os.path.join(SANDBOX_ROOT, path))
    if os.path.commonpath([candidate, SANDBOX_ROOT]) != SANDBOX_ROOT:
        raise ValueError(f"path escapes sandbox: {path}")
    return open(candidate).read()
```

`realpath` resolves `..` segments *and* follows symlinks to their real target before you compare anything. `commonpath` is a safer check than `startswith`, which can be fooled by sibling directories sharing a prefix (`/workspace/repo` vs `/workspace/repo-evil`).

This still isn't complete on its own — if the agent can also *write* files, it can plant a symlink on one call and read through it on the next, so the realpath check has to run on every call, not just at session start. And if the untrusted content an agent reasons over (a fetched webpage, a dependency's README) can suggest paths at all, treat path arguments from the model with the same suspicion you'd give a path from an HTTP request body, because structurally that's what it is.

## The rule

Never validate a filesystem path as a string. Validate the resolved path against the resolved boundary, after symlinks are followed, on every call that touches the filesystem — not once at setup. The model didn't need to be trying to escape the sandbox for the check to matter; it just needed to be trying to be helpful with a path it picked up from context you didn't fully control.
