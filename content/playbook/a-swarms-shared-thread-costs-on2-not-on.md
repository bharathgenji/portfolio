---
title: "A Swarm's Shared Thread Costs O(n²), Not O(n)"
date: "2026-08-28"
summary: "Give every agent in a swarm visibility into every other agent's messages and your cost curve stops being a budget line and starts being a math problem."
tags: ["agents", "multi-agent", "cost"]
status: draft
author: "Bharath"
---

## The swarm that got expensive on its own

A team building a claims-investigation system wired up five agents — fraud signals, policy check, claimant history, adjuster notes, a synthesizer — around a shared thread. Every agent posted its findings to the thread; before taking its next turn, every agent read the whole thing so far. At five agents it worked well and felt cheap enough not to think about. They added three more agents to cover new claim types. Per-run cost didn't go up by 60% to match the headcount. It went up by roughly 3x.

Nobody had changed a prompt or a model. The math had just caught up with them.

## Why adding one agent taxes everyone else

In a fully shared thread, every message any agent posts gets read by every other agent on their next turn. With `n` agents each posting roughly `m` messages over a run, the total tokens processed across the swarm isn't `n × m` — it's closer to `n × (n-1) × m`, because each of the `n-1` other agents re-reads every message. Go from 5 agents to 8 and you haven't added 3 workers' worth of cost, you've added roughly 8×7 vs 5×4 read-slots — more than double the cross-reads for 60% more headcount.

The bill hides this well because it doesn't show up as one big line item. It shows up as every agent's *individual* context slowly bloating over the run, which looks like normal context growth until you graph cost against swarm size and see the curve bend.

## Route through a blackboard, not a broadcast

Don't give every agent the full thread. Give each agent a coordinator-assembled slice built from what it actually needs:

```python
def context_for(agent_role: str, blackboard: list[dict]) -> str:
    relevant = [
        m for m in blackboard
        if agent_role in SUBSCRIPTIONS[m["from_role"]]
    ]
    return "\n".join(f"[{m['from_role']}] {m['summary']}" for m in relevant)
```

`SUBSCRIPTIONS` is a static map you define once: the synthesizer subscribes to everyone, but `policy_check` doesn't need to see `claimant_history`'s raw findings — it needs the synthesizer's digest of them, if anything. Most swarms have a real dependency graph under the "everyone talks to everyone" default; write it down and route on it. You cut cross-reads without cutting the information anyone actually acts on.

## Where broadcast is fine

Small `n` — three or four agents in a genuine debate round, where the point is that each sees every rebuttal — is cheap enough that the quadratic term hasn't caught up with you yet, and the full-visibility behavior is the feature, not an accident. Don't build a subscription router for that. Build it when you're past five agents, or when a swarm has distinct roles that don't all need each other's raw output.

## The tell

If adding one agent to a swarm moves the cost of the *other* agents, not just the new one's own calls, you have a broadcast topology problem, not a per-agent efficiency problem. Fix the routing before you fix any single agent's prompt.
