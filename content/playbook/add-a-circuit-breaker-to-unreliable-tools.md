---
title: "Add a circuit breaker to tools that call unreliable services"
date: "2026-06-25"
summary: "When a downstream API is down, your agent will keep hammering it — a circuit breaker breaks that cycle before it burns minutes of clock time and dozens of reasoning steps."
tags: ["agents", "reliability", "tooling"]
status: draft
author: "Bharath"
---

When a downstream API starts failing consistently, your agent doesn't notice. It calls the tool, gets an error, reasons about it, tries again. Each attempt burns 10–30 seconds on a timeout, plus the tokens for the model to process the same useless error message. In a 20-step agent run, a downed service can waste five minutes before anything useful happens.

Per-call retry with backoff helps with brief glitches. It doesn't help when the service is down for twenty minutes. After retries exhaust, your tool surfaces an error — the model processes it, decides to try again a step later, and the cycle repeats. You've traded one problem for a slower version of the same problem.

A circuit breaker breaks that cycle at the session level.

## Three states, one idea

- **Closed** (normal): calls go through, failures are counted.
- **Open** (degraded): calls fail immediately without hitting the API. Zero latency, no retries.
- **Half-open** (probing): after a cooldown period, one trial call goes through. Success resets to closed; failure re-opens.

```python
import time

class CircuitBreaker:
    def __init__(self, failure_threshold=3, cooldown=60):
        self.failure_threshold = failure_threshold
        self.cooldown = cooldown
        self._failures = 0
        self._opened_at = None

    def call(self, fn, *args, **kwargs):
        if self._opened_at is not None:
            elapsed = time.time() - self._opened_at
            if elapsed < self.cooldown:
                return {"error_type": "circuit_open", "message": "Service unavailable"}
            self._opened_at = None  # half-open: allow one probe

        result = fn(*args, **kwargs)
        if result.get("error_type") in ("server_error", "timeout"):
            self._failures += 1
            if self._failures >= self.failure_threshold:
                self._opened_at = time.time()
                self._failures = 0
        else:
            self._failures = 0
        return result
```

Wrap the tool, not the call site:

```python
_inventory_breaker = CircuitBreaker(failure_threshold=3, cooldown=60)

def get_inventory(sku: str) -> dict:
    return _inventory_breaker.call(_raw_inventory_fetch, sku)
```

When the circuit is open, the agent immediately receives `{"error_type": "circuit_open"}` — a stable, typed signal it can route on. Add a branch in your error handling to recognize this type: try an alternate data source, surface a clear message to the user, or skip that task and continue.

## The model won't figure this out

Models are poor at inferring sustained degradation across steps. They recognize individual errors but don't accumulate a "this service has been failing for the last five calls" signal across reasoning turns. Left alone, they'll retry the same broken tool every iteration, occasionally varying the arguments to try something different.

The circuit breaker externalizes that pattern-matching into deterministic code your tool layer controls. The model gets a clear, actionable error type instead of watching the agent thrash.

## Calibrating thresholds

Three failures before opening is a reasonable default. Adjust based on cost: an internal cache can tolerate `failure_threshold=2, cooldown=30`. A third-party API with occasional flakiness might warrant `failure_threshold=5, cooldown=120`.

One thing to avoid: sharing circuit state across agent runs in a persistent store unless you're actively monitoring it. A circuit that stays open because no one noticed the service recovered is worse than no circuit at all. Scoped to a single run or process, the state self-clears without ceremony.

The retry post handles individual call failures. This handles the case where a service is just down — and that distinction matters at 3am when your agent is silently burning through its step budget on a tool that isn't going to succeed.
