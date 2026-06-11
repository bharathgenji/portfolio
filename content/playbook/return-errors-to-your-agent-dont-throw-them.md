---
title: "Return Errors to Your Agent, Don't Throw Them"
date: "2026-06-11"
summary: "When a tool fails, your agent's next move depends entirely on what you hand back — an exception tells it nothing; a typed error lets it recover."
tags: ["agents", "reliability", "tools"]
status: draft
author: "Bharath"
---

## The two wrong ways to handle tool failure

When a tool fails, most implementations do one of two things:

1. **Throw an exception** — the framework catches it, the run crashes, the user gets an error.
2. **Return null or empty** — the model proceeds with no information, hallucinates an answer, or silently skips the step.

Neither is right. Both rob the model of agency.

## The model should decide what happens next

Your agent is a reasoning system. If a tool fails, the model might be able to:

- Retry with different parameters (the search query was too narrow)
- Fall back to a different tool (the primary DB is down, use the replica)
- Proceed without that data (it was enrichment, not core to the task)
- Escalate to a human (the failure is unrecoverable and the stakes are high)

It can only do any of that if you tell it what happened. A Python `ValueError` buried in a stack trace doesn't give it what it needs. `null` is worse — the model has no idea whether the tool succeeded and found nothing, or failed outright.

## Return a typed error object

Structure your tools so failures return content, not exceptions:

```python
def search_documents(query: str) -> dict:
    try:
        results = db.search(query, limit=10)
        return {"ok": True, "results": results}
    except RateLimitError:
        return {
            "ok": False,
            "error_type": "rate_limited",
            "message": "Search API rate limit hit. Retry in ~60s.",
            "retryable": True,
        }
    except TimeoutError:
        return {
            "ok": False,
            "error_type": "timeout",
            "message": "Search timed out after 5s. Try a narrower query.",
            "retryable": True,
            "suggestion": "Reduce query scope or use a more specific term.",
        }
    except NotFoundException:
        return {
            "ok": False,
            "error_type": "not_found",
            "message": f"No documents matched '{query}'.",
            "retryable": False,
        }
```

The model reads this return value the same way it reads any tool output — it reasons about `retryable`, `error_type`, and `suggestion`, then decides whether to retry, pivot, or give up. You've turned a crash into a decision point.

## What to include in the error payload

- **`ok: false`** — an unambiguous signal the call failed; don't make the model infer it
- **`error_type`** — a stable string the model can pattern-match on across runs
- **`message`** — plain English both the model and a debugging human can read
- **`retryable`** — boolean; tells the model whether a direct retry makes sense
- **`suggestion`** (optional) — a concrete next step; models follow specific hints reliably

Keep it flat. Nested error hierarchies look tidy in code but cost tokens and confuse models.

## The one exception: truly unexpected failures

Unhandled exceptions — things you *didn't* anticipate — should still propagate and crash loudly. This pattern is for *known* failure modes: rate limits, not-found, timeouts, permission errors. If your database driver segfaults or you get an `AssertionError` you've never seen before, that's not a recoverable agent situation. You want the stack trace in your logs and the run to halt.

Catch what you know how to name. Let the rest surface.

## The payoff

With structured error returns, recovery logic lives in your system prompt, not scattered across your agent loop. A single instruction — "if a tool returns `error_type: not_found`, rephrase and retry once before escalating" — is portable across models, testable with your eval suite, and readable six months from now.

The tool call layer is where failures happen. That's also where you should handle them — not by hiding them, but by giving the model exactly enough signal to act.
