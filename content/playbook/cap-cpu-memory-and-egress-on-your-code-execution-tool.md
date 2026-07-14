---
title: "Cap CPU, Memory, and Egress on Your Code-Execution Tool"
date: "2026-07-14"
summary: "A container is an isolation boundary, not a resource limit — without explicit ceilings, one bad code sample can fork-bomb, exhaust memory, or quietly exfiltrate data through an open network path."
tags: ["agents", "security", "tool-design"]
status: draft
author: "Bharath"
---

Teams that give an agent a code-execution tool almost always sandbox it — a container, a gVisor pod, a Firecracker microVM. Then they stop, because "it's sandboxed" feels like the finished sentence. It isn't. Isolation answers "can this process see the host filesystem." It says nothing about "can this process eat every core on the box for ten minutes" or "can this process open a socket to your internal metadata endpoint." Those are separate questions, and they need separate answers.

## The gap isolation doesn't close

Model-generated code doesn't need to be malicious to cause damage. A pandas script that accidentally loads a 40GB join into memory, a recursive function missing a base case, an accidental `while True` with no sleep — none of these are attacks, and all of them will happily run inside a perfectly isolated container until it falls over or takes its neighbors with it on shared infrastructure. Add prompt injection into the mix — an agent that executes code derived from fetched web content or a tool result an attacker controls — and "quietly exfiltrate data through an open socket" stops being hypothetical.

## Set the ceilings explicitly

Don't rely on container defaults. Set limits at the process boundary, deny-by-default:

```python
import resource, subprocess

def run_sandboxed(cmd: list[str], workdir: str) -> subprocess.CompletedProcess:
    def _limits():
        resource.setrlimit(resource.RLIMIT_CPU, (10, 10))          # 10s CPU time
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024**2,) * 2)  # 512MB address space
        resource.setrlimit(resource.RLIMIT_NPROC, (32, 32))         # no fork bombs
        resource.setrlimit(resource.RLIMIT_FSIZE, (50 * 1024**2,) * 2)  # 50MB output cap

    return subprocess.run(
        cmd, cwd=workdir, preexec_fn=_limits, timeout=15,
        env={"HTTP_PROXY": "http://egress-allowlist:3128"},  # deny by default, allowlist by exception
        capture_output=True,
    )
```

Four dimensions matter, and they fail independently: CPU time (a runaway loop), address space (an unbounded allocation), process count (a fork bomb), and network egress (the one people forget). The timeout from your tool layer catches wall-clock hangs; it won't catch a process that's actively running and burning memory the whole time. You need both.

## Egress is the one that bites you later

Filesystem and CPU limits fail loudly — the process crashes, you see it in logs. A missing egress restriction fails silently: the code runs to completion, returns a plausible result, and nobody notices it also made a request to an internal service or an attacker-controlled URL embedded in the input data. Route all sandbox network traffic through an explicit proxy allowlist rather than open internet access. If the task needs `pip install`, allowlist your package index specifically — not `*`.

## The rule

Treat every resource dimension a process can consume as something you cap, not something you hope stays reasonable. A sandbox without limits isn't a weaker version of a sandboxed tool — it's an unsandboxed one that happens to have a different root directory.
