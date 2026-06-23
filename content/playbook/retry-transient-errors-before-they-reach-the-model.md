---
title: "Retry Transient Errors Before They Reach the Model"
date: "2026-06-23"
summary: "Infrastructure errors like rate limits and timeouts should never pollute your agent's context — retry them silently, and reserve structured errors for failures the model can actually reason about."
tags: ["agents", "reliability", "tooling"]
status: draft
author: "Bharath"
---

## The Mistake: One Error Handler for Everything

Every tool call can fail. The common mistake is treating all failures identically — either retry everything, or surface everything to the model.

Both are wrong.

Retrying a "record not found" error three times changes nothing. But surfacing a network timeout to your agent is equally bad: now the model spends reasoning tokens on transient infrastructure noise instead of the task. You've polluted the context with a signal the model cannot usefully act on.

Tool failures split cleanly into two categories. Route them differently.

## Infrastructure Failures: Retry Silently in Your Tool Layer

Transient errors would succeed if you waited and tried again. They include:

- Rate limits (HTTP 429, `Retry-After` headers)
- Network timeouts and connection resets
- Upstream 5xx server errors
- Throttling from third-party APIs

Catch these in your tool wrapper — before the result touches the context window — and retry with backoff:

```python
def with_retry(fn, retryable=("rate_limited", "server_error"), max_attempts=3):
    delay = 1.0
    for attempt in range(max_attempts):
        result = fn()
        if result.get("error_type") not in retryable:
            return result
        if attempt < max_attempts - 1:
            time.sleep(delay)
            delay *= 2
    return result  # surface the final failure as a structured error
```

The agent never sees the 429. After retries exhaust, it gets a clean typed error it can reason about — not an intermediate infrastructure detail.

## Semantic Failures: Return Immediately to the Agent

Semantic failures carry information the agent needs to adapt. Retrying is useless; hiding them is worse. Examples:

- `not_found` — the agent should try a different identifier or rephrase the query
- `access_denied` — the agent should escalate or find an alternate path
- `no_results` — the agent should expand scope or acknowledge the limit
- `invalid_input` — the agent passed wrong args and should self-correct

Return these immediately as typed error objects (`ok: false`, stable `error_type`, plain-English `message`). The model reads them like any tool result and decides what to do next: modify the query, try a fallback tool, or surface the gap to the user.

The distinction is simple: would retrying the exact same call help? If yes, handle it in infrastructure. If no, give the agent the signal.

## The Cost of Getting This Wrong

I've watched agents reason for three turns about a transient rate limit. "The tool returned an error — I'll try a different approach." Wrong tool, wrong query, wrong trajectory. All because a 429 leaked into context instead of being silently retried.

The reverse failure is subtler: hiding `not_found` behind a retry loop means the agent never learns the record doesn't exist. It keeps calling with the same args. Same result, three times, then an opaque final error with no useful signal for recovery.

The split is a few lines of code in your tool base class. Add it before you build your third tool, not after your first production incident.
