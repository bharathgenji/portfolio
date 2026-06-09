---
title: "Add a Loop Detector to Every Agent"
date: "2026-06-09"
summary: "Agents don't know they're repeating themselves — you have to tell them, before they burn your token budget proving it."
tags: ["agents", "reliability", "production"]
status: draft
author: "Bharath"
---

## The failure mode nobody talks about

Your agent calls `search_docs("authentication error")`. Gets back irrelevant results. Tries again with the same query. Still irrelevant. Calls it a third time. You didn't set an iteration limit because you expected the task to self-terminate. It doesn't.

This isn't a hallucination problem or a prompt problem. It's a missing invariant: **the agent has no memory that it already tried this exact thing.** The model reasons forward from its current context, and "try again" is a perfectly rational response to a failed tool call — unless you know you've already tried.

A global `max_iterations=20` doesn't fix this. It just means you burn 20 iterations instead of infinite ones. What you want is step-level loop detection.

## Fingerprint every tool call

The fix is mechanical: hash the tool name and its arguments before executing, and abort if you've seen that fingerprint in the current run.

```python
import hashlib, json

def step_fingerprint(tool_name: str, args: dict) -> str:
    canonical = json.dumps(args, sort_keys=True)
    return f"{tool_name}:{hashlib.md5(canonical.encode()).hexdigest()[:8]}"

seen_steps: set[str] = set()

def call_tool(tool_name: str, args: dict) -> dict:
    fp = step_fingerprint(tool_name, args)
    if fp in seen_steps:
        return {
            "error": "loop_detected",
            "tool": tool_name,
            "message": "This exact call was already made. Try a different approach.",
        }
    seen_steps.add(fp)
    return execute_tool(tool_name, args)
```

Return a structured error, not an exception. The model reads tool results — if you surface `loop_detected` as a first-class signal, a well-prompted agent will route around it. An uncaught exception just ends the run without giving the model a chance to recover.

## Three things that make this work

**Hash the arguments, not just the tool name.** Two calls to `search_docs` with different queries are fine. The same query twice is the problem. Sort keys before hashing so argument ordering doesn't create phantom uniqueness.

**Scope fingerprints per task, not per process.** If your agent handles multiple tasks in one run, reset `seen_steps` between tasks. Sharing state across them will block legitimate repeated calls on independent work.

**Surface the signal in the tool result.** `"You already called list_files on this directory — the results are above in your context"` is actionable. A log line the model never sees isn't. Make the loop detector something the model can reason about, not just something your infrastructure tracks.

## The budget argument

An unchecked loop on a 3-second tool call at $0.01/step costs $36/hour per stuck agent. With fingerprint detection, that loop terminates in one extra round-trip. The hashing overhead is microseconds.

Put this in your tool executor, not your prompt. Prompts are soft contracts. The loop detector needs to be infrastructure — enforced regardless of what the model decides to do.
