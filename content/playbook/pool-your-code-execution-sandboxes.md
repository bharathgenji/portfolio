---
title: "Pool Your Code-Execution Sandboxes"
date: "2026-08-04"
summary: "A fresh container per tool call feels like the safe default, but the cold start is often longer than the code it's about to run."
tags: ["agents", "latency", "tool-design"]
status: published
author: "Bharath"
---

## The tool call that's slower than the code it runs

An agent asks to run a six-line pandas snippet. The snippet executes in 40ms. The tool call takes 2.3 seconds. Almost none of that gap is the code — it's `docker run` pulling a layer cache, a Firecracker microVM booting, a Python interpreter cold-starting inside it, and a network namespace getting wired up, all before your six lines ever touch the CPU. Do this per call, and an agent that runs code eight times in one task pays eight cold starts, serially, on the critical path the user is staring at.

The instinct is to blame the sandbox technology. It's usually not the bottleneck — the *lifecycle* is. Spinning a sandbox up and tearing it down per call treats an expensive resource like a disposable one.

## Keep a warm pool, not a spawn-per-call

Run a fixed number of sandboxes continuously, and hand the agent one from the pool instead of booting a fresh one:

```python
class SandboxPool:
    def __init__(self, size: int, factory: Callable[[], Sandbox]):
        self._idle = queue.Queue()
        for _ in range(size):
            self._idle.put(factory())

    def acquire(self, timeout: float = 5.0) -> Sandbox:
        sandbox = self._idle.get(timeout=timeout)
        sandbox.reset()          # wipe filesystem, kill stray processes
        return sandbox

    def release(self, sandbox: Sandbox):
        self._idle.put(sandbox)
```

`acquire` returns in milliseconds because the process, interpreter, and network namespace already exist — `reset()` just clears the working directory and kills anything left running, which is orders of magnitude cheaper than a fresh boot. Size the pool to your peak concurrent agent count, not your average; a pool that's too small just moves the wait from "cold start" to "queued behind another agent's sandbox," which is a smaller problem but still a queue.

## Reset has to be real isolation, not a wipe-and-hope

This is where teams get burned. `reset()` needs to guarantee the next tenant sees zero state from the last one — env vars, background processes, half-written files, DNS cache entries. If reset is a soft `rm -rf /workdir` and the last job set an environment variable or left a listener on a port, the next agent's code runs in a contaminated environment and produces a result that's wrong for reasons that will not show up in any log you thought to check. Test reset the same way you'd test the sandbox's original isolation boundary — try to leak state across a release/acquire cycle on purpose, and don't trust it until that fails.

## Recycle on suspicion, not on a timer

Pooled sandboxes should still die and get replaced — after N uses, after any non-zero exit that looks like a crash rather than a clean error, or immediately if `reset()` itself throws. A sandbox that's been reset 500 times without ever fully restarting is a sandbox accumulating whatever reset doesn't clean up, and you won't find out what that is until it's already served a bad result to three different runs. Treat the pool as a cache with an eviction policy, not a fixed set of long-lived boxes you trust forever.
