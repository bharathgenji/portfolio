---
title: "A Child Agent's Timeout Is a Slice, Not a Copy"
date: "2026-07-23"
summary: "Give every sub-agent the same deadline as its parent and the fourth one in a sequential fan-out inherits a promise the run can no longer keep."
tags: ["agents", "multi-agent", "reliability"]
status: draft
author: "Bharath"
---

## The run that timed out looking healthy

An orchestrator agent gets a 60-second SLA and fans out to three sub-agents in sequence: research, draft, review. Each sub-agent call is wrapped in `with_timeout(coro, seconds=60)` — the same helper, the same 60, copy-pasted from the orchestrator's own timeout because that's what was already in scope. Research takes 25 seconds. Draft takes 30. Review starts at second 55 with a fresh 60-second window of its own and the orchestrator's actual caller — a user-facing endpoint with a 60-second SLA — gives up at second 60, five seconds into review, with nothing to show for it. Every individual timeout fired correctly. The system still blew its deadline, because "60 seconds" was true three times in a row instead of once, total.

This isn't a bug in any single timeout. It's a category error: a timeout value got copied from parent to child instead of divided.

## A deadline is a fact about wall-clock time, not a constant to reuse

The parent's timeout means "the whole call, start to finish, has this long." When the parent spawns children, each child's share has to come out of what's left, not restate the original number. The fix is to pass a deadline — an absolute point in time — down through the call chain, and have every layer compute its own remaining budget from it instead of carrying its own fixed constant.

```python
import time

class Deadline:
    def __init__(self, at: float):
        self.at = at

    @classmethod
    def in_seconds(cls, seconds: float) -> "Deadline":
        return cls(time.monotonic() + seconds)

    def remaining(self) -> float:
        return max(0.0, self.at - time.monotonic())

    def expired(self) -> bool:
        return self.remaining() <= 0.0


async def run_subagent(coro, deadline: Deadline, name: str):
    if deadline.expired():
        return {"error": "deadline_exceeded", "agent": name, "remaining": 0}
    try:
        return await asyncio.wait_for(coro, timeout=deadline.remaining())
    except asyncio.TimeoutError:
        return {"error": "subagent_timeout", "agent": name}
```

The orchestrator creates one `Deadline` at the top and threads the same object through research, draft, and review. Draft doesn't get "60 seconds," it gets whatever research left behind. Review doesn't get a fresh window at all — by second 55 it can see it has 5 seconds and can decide to skip straight to returning research's output unreviewed rather than starting work it can't finish.

## Reserve a slice for the step that has to run

Not every child deserves an equal fraction. If review is cheap but mandatory — a policy check, a safety filter — reserve its slice explicitly instead of letting earlier steps consume the whole deadline optimistically:

```python
REVIEW_RESERVE_SECONDS = 8

def budget_for_research_and_draft(deadline: Deadline) -> float:
    return max(0.0, deadline.remaining() - REVIEW_RESERVE_SECONDS)
```

Research and draft share whatever's left after carving out review's floor. This turns "review didn't get to run" from a race into a deliberate tradeoff you set once, not a timing accident that depends on how slow the API was that day.

## Propagate the deadline, not just the timeout

If you're already threading a trace ID through every tool call for observability, thread the deadline the same way — it's the same kind of per-run context that has no business being a hardcoded constant at each layer. A child agent that logs `remaining=3s` when it starts is a child agent whose owner can tell, from the log line alone, why it returned a partial result instead of debugging a mystery timeout an hour later.
