---
title: "Give Your Agent a Deadline, Not Just a Budget"
date: "2026-08-07"
summary: "A token budget caps what a run costs — it does nothing to cap how long it takes, and a single slow tool call can blow your SLA while staying well under budget."
tags: ["agents", "reliability", "latency"]
status: draft
author: "Bharath"
---

## Two different resources, one missing constraint

Token budgets cap cost. They do not cap time. An agent can stay comfortably under its token ceiling — a dozen cheap tool calls, a short final answer — and still take four minutes if three of those calls hit a slow search API or a rate-limited third party. If the caller is a chat UI with a 30-second patience window, or an orchestrator waiting to hand off to the next stage, the run is a failure regardless of what the token meter says. Most agent harnesses track cost obsessively and latency as an afterthought, because cost shows up on an invoice and latency only shows up when a user closes the tab.

## Where this actually bites

A support agent calls a knowledge-base search, then an order-lookup API, then drafts a reply. Each step is well within its token allowance. But the order-lookup API is having a slow day — 12 seconds instead of 300ms — and the agent, having no notion of elapsed time, proceeds calmly to a third tool call afterward. Nothing in the token accounting flags this as a problem. The user has already given up.

## Push a deadline down, don't just check one at the top

A deadline checked once per orchestrator loop is too coarse — it catches runaway loops but not a single tool call that eats the whole budget in one shot. Pass the remaining time budget into every tool call so the call itself can't outlast it:

```python
def run_step(deadline: float, tool, **kwargs):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise DeadlineExceeded()
    return tool(timeout=min(tool.default_timeout, remaining), **kwargs)
```

Now a slow tool is capped by whatever time is actually left, not by its own default timeout. A tool that would normally wait 30 seconds gets cut off at 4 if that's all the run has, instead of consuming the rest of the deadline on its own.

## Degrade instead of failing at zero

The wrong response to a blown deadline is throwing an error after the model already did most of the work. If the agent has a partial answer — three of four sections drafted, the order found but not yet formatted into a reply — return that with a flag, not a blank failure. Decide up front which steps are load-bearing (must complete) versus enrichment (skip if time is short), the same way you'd mark fan-out slices required or best-effort. A support reply missing the "related articles" footer is a fine outcome under time pressure; a support reply missing the actual answer is not.

## Deadlines are a request property, not a constant

Don't hardcode one global timeout. A background batch job and an interactive chat turn have wildly different tolerances, and the same agent code often serves both. Pass the deadline in with the request, the way you'd pass in the token budget, and let the caller who actually knows the SLA set it.

Cost tells you what a run is allowed to spend. Deadline tells you what a run is allowed to take. Ship an agent with only the first and you've optimized the bill while the users on the other end of a slow tool call have already left.
