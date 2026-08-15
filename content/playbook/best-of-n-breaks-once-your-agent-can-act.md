---
title: "Best-of-N Breaks Once Your Agent Can Act"
date: "2026-08-15"
summary: "Sampling an agent three times and picking the best transcript works great for text — and sends three refund emails before you've picked a winner."
tags: ["agents", "reliability", "multi-agent"]
status: draft
author: "Bharath"
---

## Three winners, three refunds

A team running best-of-N on a customer support agent noticed something odd in their Stripe dashboard: some disputes were getting refunded twice, occasionally three times, for the same dollar amount, seconds apart. The agent looked fine in every eval. The bug wasn't in the agent — it was in the sampling strategy wrapped around it.

They'd taken the standard advice: sample the agent three times in parallel, judge the transcripts, keep the best one. That pattern is genuinely good for text generation — three drafts of a summary, three candidate SQL queries, three routing decisions. Pick the best after the fact, discard the rest, nothing lost. But this agent didn't just generate a transcript. It called `issue_refund` mid-run, because issuing the refund *was* the task. All three samples ran to completion. All three refunds went through. Then the orchestrator dutifully picked the "best" transcript to show in the audit log, as if the other two hadn't already moved money.

## The assumption best-of-N is quietly making

Best-of-N assumes generation and commitment are separate steps — that you can produce N candidates, inspect them, and only then let one of them become real. That's true for a paragraph of text. It's false for a tool call with a side effect, because the side effect happens the moment the model calls the tool, not the moment you pick a winner. Running an agent N times isn't sampling N *outputs*; it's executing N *timelines*. If a tool inside any of them writes to the world, you don't get to un-execute the ones you didn't choose.

## Split "decide" from "do"

The fix is to make sure the thing you're sampling can't act — only propose. Run the N candidates with side-effecting tools swapped for their dry-run equivalents, so each one produces a plan instead of an outcome:

```python
async def best_of_n_plan(task_input: str, n: int = 3) -> dict:
    plans = await asyncio.gather(*[
        run_agent(task_input, temperature=0.7, dry_run=True)
        for _ in range(n)
    ])
    winner = judge_plans(plans)
    return await run_agent(task_input, temperature=0.0, dry_run=False, seed_plan=winner)
```

Judge and select among the N *plans*, not among N completed runs. Only the winning plan gets replayed with tools live. This is the same dry-run threading from [Give Your Agent a Dry-Run Mode](/playbook/give-your-agent-a-dry-run-mode) — best-of-N is just another consumer of the same `describe_effect` output, sitting upstream of execution instead of downstream of an approval gate.

## Where you don't need this

Not every tool call needs the split. Read-only tools — search, fetch, a SQL `SELECT` against a replica — are safe to run for real across all N branches, because running the same read three times doesn't compound into three of anything. The rule isn't "never sample an acting agent," it's "never sample past the last reversible point." Audit your tool list before you multiply a run: if every tool a candidate might call is a read, best-of-N on live runs is fine and often simpler. The moment one tool writes, charges, sends, or deletes, gate the fan-out at the plan, not the outcome.

The question to ask before wrapping any agent in a sampling loop: if I run this N times, does the Nth run see a world already changed by the first N-1? If yes, you're not sampling outputs anymore. You're racing side effects.
