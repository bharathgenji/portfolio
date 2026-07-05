---
title: "Give Your Agent a Dry-Run Mode"
date: "2026-07-01"
summary: "You can't review a plan you can't see — a dry-run mode lets you preview every side effect an agent would cause before any of them actually happen."
tags: ["agents", "testing", "tool-design"]
status: published
author: "Bharath"
---

## The problem with reviewing after the fact

You want a human to approve an agent's plan before it fires off three emails, a refund, and a Slack message. So you log what the agent did and show it to someone afterward. That's not review — that's an audit trail. By the time anyone reads it, the emails are already sent.

Real review requires the agent to produce its full set of intended actions without executing any of them. Most teams don't build this because it looks like it requires two versions of every tool. It doesn't — it requires one flag, threaded consistently.

## Thread a dry_run flag through the executor, not the tools

Don't ask each tool author to implement simulation logic. Put the branch in the executor that calls the tool, and let tools declare what they *would* do.

```python
def execute_tool(tool_name: str, args: dict, dry_run: bool = False) -> dict:
    tool = registry[tool_name]
    if dry_run:
        return {
            "simulated": True,
            "tool": tool_name,
            "args": args,
            "would_effect": tool.describe_effect(args),
        }
    return tool.run(args)
```

`describe_effect` is the only thing each tool needs to add — a cheap, side-effect-free method that says what would happen: "would charge $42.00 to card ending 1187," "would send email to 3 recipients," "would delete 14 rows." For read-only tools, this is trivial — the effect is "no state change," and you can even let them execute for real in dry-run mode, since reads are safe and the results make the preview more useful.

## Run the whole plan in dry-run before committing to it

The payoff isn't simulating one call — it's running the agent's *entire* multi-step plan in dry-run mode and inspecting the accumulated effects before flipping to live execution:

```python
plan_state = agent_loop(state, dry_run=True)
effects = plan_state.collect_effects()
if requires_approval(effects):
    await get_human_approval(effects)
agent_loop(state, dry_run=False)
```

This catches a category of bug that per-call validation misses entirely: a plan where each individual action is legitimate but the combination is wrong — refunding the same order twice across two different steps, or emailing a customer who was already unsubscribed by an earlier step in the same run. You only see that by looking at the full effect set together.

## Where else this pays for itself

Dry-run mode isn't just for human approval gates. Use it to:

- **Eval your agent for free.** Run your eval suite in dry-run and assert on intended effects instead of maintaining a sandbox environment with fake Stripe accounts and disposable email inboxes.
- **Catch runaway plans before they cost money.** A dry run that produces 200 intended API calls is a signal something's wrong, before you've paid for any of them.
- **Debug without side effects.** Reproduce a bad run locally by replaying its inputs in dry-run mode — no risk of re-triggering the real-world consequences you're trying to debug.

The cost is one field on your tool interface. The return is that "let me see what it would do first" becomes a real capability instead of a thing you promise and can't deliver.
