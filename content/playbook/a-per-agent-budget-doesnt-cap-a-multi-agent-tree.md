---
title: "A Per-Agent Budget Doesn't Cap a Multi-Agent Tree"
date: "2026-08-12"
summary: "Every agent in the tree stayed under its own token ceiling and the run still cost forty times what you priced it at — because nothing was capping the tree, only the nodes."
tags: ["agents", "cost", "multi-agent"]
status: published
author: "Bharath"
---

## Every node was fine. The tree wasn't.

A research orchestrator spawns a sub-agent per open question. Each sub-agent has a 20k-token budget, enforced the way it should be — tracked in code, cut off at 90%, all correct. The catch: a sub-agent that finds three follow-up questions worth investigating is allowed to spawn three more sub-agents, each with its own fresh 20k budget, because that's how the recursion was written. Depth three, branching factor three, and a run that was priced at "maybe five sub-agents, 100k tokens" turns into 39 sub-agents and 780k tokens before anyone notices. Every single node stayed under its ceiling. Nobody capped the tree.

This is a different failure from a static fan-out with a fixed list of sections ([[fan-out-multiplies-failure-not-just-cost]]) — there the width is known up front and the risk is reliability, not runaway cost. Here the width and depth are decided at runtime, by the model, one spawn decision at a time, and a per-node budget has no way to see the shape of the tree it's part of.

## The budget has to be a shared resource, not a per-call constant

Pass a mutable remaining-budget object down through every spawn, the same way you'd thread a deadline through a call chain instead of copying a timeout constant to each child. Every agent — parent or child — draws from the same pool.

```python
class BudgetLedger:
    def __init__(self, total: int):
        self.remaining = total
        self._lock = threading.Lock()

    def reserve(self, amount: int) -> bool:
        with self._lock:
            if amount > self.remaining:
                return False
            self.remaining -= amount
            return True

def spawn_subagent(question: str, ledger: BudgetLedger, per_node: int = 20_000):
    if not ledger.reserve(per_node):
        return {"skipped": "tree_budget_exhausted", "question": question}
    return run_agent(question, budget=per_node, ledger=ledger)
```

A child that wants to spawn grandchildren has to reserve from the same ledger its siblings are drawing down. Once the pool is gone, the model can still *decide* a fourth sub-agent is worth spawning — it just can't get budget for one, and the code returns a clean "skipped" result instead of silently letting the tree grow.

## The lock matters more than the number

If agents run in parallel — which is the whole point of fanning out — a check-then-decrement without a lock races: two siblings both check `remaining > 20_000` against the same stale read, both proceed, and you've overspent the ledger by exactly the amount you thought you'd prevented. This is the same write-concurrency problem as any other shared mutable state touched from parallel tool calls, and it needs the same fix: an atomic reservation, not a read followed by a write.

## Cap depth and width independently of tokens

A token ledger alone will still let a pathological case through — a thousand tiny sub-agents at 200 tokens each, still burning wall-clock and API rate limit headroom even while technically under budget. Set an explicit `max_agents` and `max_depth` on the ledger alongside the token count. The token cap answers "what can this cost." The count and depth caps answer "how weird is the tree allowed to get" — and you want both, because a tree that's cheap but enormous breaks your rate limiter just as reliably as one that's expensive but shallow.
