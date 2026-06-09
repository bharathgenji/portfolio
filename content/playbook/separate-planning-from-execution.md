---
title: "Separate planning from execution in your agent loop"
date: "2026-06-08"
summary: "A tight reason-act loop buries every decision inside the run — extracting a structured plan first makes your agent inspectable, debuggable, and safe to pause."
tags: ["agents", "patterns", "reliability"]
status: published
author: "Bharath"
---

When your agent runs a tight reason-act loop — think, call tool, observe, think again — you get one thing for free: adaptability. You get one thing not for free: inspectability. Every decision is buried inside a running conversation. You can't see what the agent intends to do until it's already doing it.

The fix is a phase split. First call extracts a plan. Second phase executes it.

## The two-phase pattern

```python
PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "tool": {"type": "string"},
                    "args": {"type": "object"},
                    "rationale": {"type": "string"}
                },
                "required": ["tool", "args"]
            }
        }
    }
}

# Phase 1: plan
plan = llm(model, PLAN_PROMPT, user_request, schema=PLAN_SCHEMA)
steps = plan["steps"]

# Optional: validate or log the full plan before any side effects

# Phase 2: execute
results = []
for step in steps:
    result = run_tool(step["tool"], step["args"])
    results.append({"step": step, "result": result})
```

The model never self-executes. Your code executes. The model only decides what should happen.

## What this buys you

**Inspection before commitment.** You have the full plan as a data structure before any tool runs. Log it, run a judge against it, abort if it looks wrong. None of this is possible inside a self-directed loop — the first action happens before you can review the intent.

**Deterministic execution trace.** Your executor is a `for` loop over a known list, not a live model decision. The agent isn't improvising at step 4. Once the plan is set, every step is predictable and loggable.

**A human-in-the-loop checkpoint for free.** If you want approval before high-stakes actions, the phase split gives you a natural insertion point — after planning, before executing. No mid-stream pause logic required; just insert a `confirm()` call between the two phases.

**Replayability.** Save the plan as JSON. When something goes wrong at step 3 of 6, you can re-execute steps 3–6 directly without re-running planning. This pairs cleanly with idempotency keys — same plan step, same idempotency key, safe to retry.

## When the plan needs to adapt

Two-phase works when the plan can be fully specified upfront. It breaks when later steps depend on earlier results in ways you can't know at planning time — if you need to look up an order ID before you can fetch order details, that dependency has to live in a reactive loop.

A useful heuristic: if your plan schema contains any field like `"depends_on_step"`, you need the dynamic loop. If every step's arguments can be written before any tool runs, two-phase will work.

A hybrid approach handles most real cases: plan first, but allow the executor to request a replan after a step fails unexpectedly. Planning calls are cheap; re-running one mid-execution is fine. You still get an inspection checkpoint at each plan boundary.

## The production reason to care

In a tight reason-act loop, a bug surfaces as "the agent did the wrong thing." Debugging means reading an entire conversation history and reconstructing where the model went off track. With a phase split, a bug is either "the plan was wrong" or "the execution of step N was wrong" — two entirely different root causes with entirely different fixes. That diagnosis gap narrows from hours to minutes.

The separation also makes testing tractable. You can unit-test the executor against a hardcoded plan without invoking a model at all. You can test the planner by validating its output schema without running any tools. Two phases, two independent test surfaces.