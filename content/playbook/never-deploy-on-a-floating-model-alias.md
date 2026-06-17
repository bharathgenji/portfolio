---
title: "Never Deploy an Agent on a Floating Model Alias"
date: "2026-06-17"
summary: "Using 'claude-latest' or 'gpt-4' in production is a silent dependency on a moving target — the model your evals tested is not the model your users run."
tags: ["agents", "reliability", "production"]
status: draft
author: "Bharath"
---

When you deploy an agent in production, every dependency gets pinned: library versions, database schemas, environment variables. The one thing teams routinely leave floating is the model.

Using `"claude-sonnet-latest"` or `"gpt-4"` in a production agent is equivalent to depending on `requests>=2` in Python — except model providers don't publish behavior changelogs with the precision package managers do, and they don't give you a lockfile. When a provider promotes a new checkpoint behind an alias, your agent gets new behavior without a deployment.

## What "floating" actually costs

The failure mode is subtle. The agent doesn't crash — it just starts handling edge cases differently. A new checkpoint might be more likely to call a specific tool, refuse certain inputs, format its output differently, or structure its reasoning in a way that breaks downstream parsing. You might catch it if behavior changes dramatically. You won't catch 5% drift until a user does.

The other cost is accountability. When something breaks and you're not sure whether it's your code or the model, floating aliases make the answer much harder to determine. You have no way to reproduce the state from last Tuesday.

## The fix: pin to a version-specific model ID

Every major provider exposes stable, version-specific IDs alongside their aliases. Use those in production.

```python
# Floating — behavior changes silently when provider updates the alias
client.messages.create(model="claude-sonnet-latest", ...)

# Pinned — behavior is stable until you explicitly update
client.messages.create(model="claude-sonnet-4-5-20251022", ...)
```

This costs nothing. It makes the model a first-class versioned dependency. When a provider ships a new checkpoint, you evaluate it deliberately, then update the ID.

## Treat a model upgrade like a dependency bump

The upgrade workflow should feel familiar:

1. Run your eval suite against the new model ID before touching production
2. Canary to a slice of traffic and compare traces to the control
3. Update the pinned ID in a tracked config and deploy normally

This means maintaining an eval suite. Even 20 representative inputs will catch 80% of behavioral regressions between checkpoints. The investment is small; the alternative is discovering the regression via a support ticket.

## Centralize the ID — don't scatter it

If your model ID lives in five different `.env` files, you'll update three of them during an upgrade and miss two. Define it once.

```python
# config.py
AGENT_MODEL = "claude-sonnet-4-5-20251022"
JUDGE_MODEL  = "claude-haiku-4-5-20251001"
```

Pull from this at every call site. Your version control history then shows exactly when each model changed and why — which matters when you're bisecting a regression six weeks later.

## When floating is fine

For local development and internal experiments, aliases are fine. You want to track the frontier, not pin it. The line is user-facing production traffic: anything a real user depends on should be deterministic. Anything you're exploring locally can float freely.

The model that passes your evals should be the model your users run. Pin the ID, upgrade deliberately, and treat the model the same way you treat any other versioned dependency.
