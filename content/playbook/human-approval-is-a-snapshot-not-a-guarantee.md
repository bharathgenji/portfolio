---
title: "Human Approval Is a Snapshot, Not a Guarantee"
date: "2026-07-04"
summary: "The state your agent showed a human at approval time isn't the state it acts on at execution time — and that gap is where wrong actions slip through clean review."
tags: ["agents", "reliability", "human-in-the-loop"]
status: draft
author: "Bharath"
---

Your agent proposes deleting 40 stale feature flags. A human reviews the list in Slack, clicks approve. Twenty minutes later — because the reviewer was in a meeting, or your approval queue batches requests — the agent executes the plan. Three of those flags are now being read by a deploy that went out ten minutes ago. The human approved a true statement about the world as it was. The agent executed against a world that had already moved on.

This is a time-of-check-to-time-of-use bug, and human-in-the-loop agents have it by default. Nobody designs it in; it falls out of the natural gap between "propose and ask" and "get an answer back," which can be seconds or hours depending on how your approval UI works.

## Where it hides

The bug doesn't show up in testing because your test approves instantly. It shows up in production, where approvals queue, reviewers get pulled into meetings, and Slack buttons sit unclicked for a while. The longer the gap, the more likely the underlying state has drifted — and the failure is silent. Nothing errors. The action just executes against different data than what was reviewed, and the audit log shows a human approved it.

The higher the blast radius of the action, the more this matters: refunds, deletions, permission grants, infrastructure changes. These are exactly the actions you gated behind approval in the first place, which means this bug concentrates in your highest-stakes code path.

## Fingerprint the state, not just the plan

Don't just serialize the proposed action for approval — hash the preconditions it depends on, and check that hash again immediately before execution.

```python
def propose(action: Action) -> ApprovalRequest:
    preconditions = fetch_preconditions(action)  # flag read-counts, balances, etc.
    fingerprint = hash_state(preconditions)
    return ApprovalRequest(action=action, fingerprint=fingerprint)

def execute_if_still_valid(approved: ApprovalRequest) -> Result:
    current = fetch_preconditions(approved.action)
    if hash_state(current) != approved.fingerprint:
        return Result.needs_reapproval(diff(approved.fingerprint, current))
    return execute(approved.action)
```

`fetch_preconditions` should pull the specific facts the approval decision actually depended on — read-counts for a flag deletion, balance and refund status for a refund, current role bindings for a permission change. Not the whole world, just the load-bearing parts.

## What to do on a mismatch

Don't silently proceed and don't silently drop the action. Re-run the proposal step against current state, show the human what changed, and require a fresh approval. Most of the time the diff is irrelevant — a flag's read-count moved from 0 to 1 for an unrelated reason — and re-approval takes ten seconds. Occasionally the diff is exactly the thing that should stop the action, and that's the entire point of the check.

Log every mismatch separately from clean executions. A high mismatch rate on a given action type tells you your approval queue is too slow relative to how fast that state changes — which is a latency problem worth fixing upstream, not just gating around.

The approval a human gave you was correct for a moment in time. Treat it as evidence for that moment, not as a standing authorization for whatever state exists when your executor finally gets around to running it.
