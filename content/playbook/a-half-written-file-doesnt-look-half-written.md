---
title: "A Half-Written File Doesn't Look Half-Written"
date: "2026-10-24"
summary: "An agent killed mid-write doesn't leave an error on disk — it leaves a file that opens fine, parses fine, and is quietly missing its last object."
tags: ["agents", "reliability", "filesystem"]
status: draft
author: "Bharath"
---

## The checkpoint that parsed, barely

An agent running a long research task wrote its progress to `checkpoint.json` after every section — a list of findings, append a new one, write the whole file back. The orchestrator enforced a hard wall-clock timeout per step and killed the process on expiry. One run got killed mid-write to the checkpoint file. The next attempt read `checkpoint.json`, and it parsed: valid JSON, a list with eleven findings instead of the fourteen that had actually been collected. No exception, no corrupt-file error — just a shorter, perfectly well-formed list, because the kill landed after the writer had flushed a complete comma-separated run of objects but before it wrote the closing bracket for the rest. The retry picked up from "done," silently redid three sections as new ones, and the final report had duplicate findings nobody caught until a customer pointed one out.

A truncated write doesn't always look truncated. JSON, CSV, line-delimited logs — most text formats are valid at many prefixes of their final byte stream, not just at the end. The failure mode you're defending against isn't "file is garbage," which is easy to detect. It's "file is valid and wrong," which isn't.

## Why `write()` in place is the wrong primitive

```python
# don't do this
with open("checkpoint.json", "w") as f:
    json.dump(findings, f)
```

`open(path, "w")` truncates the existing file immediately, then writes the new content over time. If the process dies between the truncate and the final flush — a kill signal, an OOM, a timeout — whatever's on disk is whatever bytes landed before the process died. There's no atomicity here at all: not "all the new content or none of it," but "some unspecified prefix of the new content, and none of the old."

## Write to a temp file, then rename

The fix is the same one every database and build tool uses: write the full new content somewhere else, then swap it into place with a rename, which is atomic on POSIX filesystems (and on NTFS via `MoveFileEx` with `MOVEFILE_REPLACE_EXISTING`).

```python
import json, os, tempfile

def write_checkpoint(path: str, data) -> None:
    dir_ = os.path.dirname(path) or "."
    fd, tmp_path = tempfile.mkstemp(dir=dir_)
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)  # atomic on the same filesystem
    except Exception:
        os.unlink(tmp_path)
        raise
```

A kill at any point before `os.replace` leaves the original `checkpoint.json` untouched — stale, but intact and readable. A kill at any point after `os.replace` leaves the new one, complete. There's no window where a reader sees a partial file, because `write_checkpoint` never mutates the path readers actually open.

## Where this bites in agent systems specifically

Agent loops hit this harder than typical services because they're killed non-gracefully more often — timeouts, kill switches, OOM from a runaway context, a supervisor that SIGKILLs on deadline rather than asking nicely. Any file an agent treats as durable state across retries — checkpoints, scratch files, cached tool results, handoff artifacts between subagents — needs the temp-file-and-rename treatment. Anything your agent reads and trusts without re-deriving should be written in a way that guarantees "exists at this path" implies "complete," because the agent has no way to tell the difference from the content alone.
