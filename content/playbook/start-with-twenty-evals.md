---
title: "Your agent needs a test suite. Start with 20 examples."
date: "2026-05-29"
summary: "You wouldn't ship code without tests. Don't ship an agent without evals — and you can bootstrap a useful eval set in an afternoon."
tags: ["agents", "evals", "reliability"]
status: published
author: "Bharath"
---

The fastest way to tell whether an "AI agent" is a product or a demo: ask to see the evals. Demos have vibes. Products have a number that goes up.

The good news is you don't need a research-grade harness to start. You need **twenty examples**.

## Why twenty

Twenty real cases is enough to catch the failure modes that actually matter, and small enough that you'll actually build it today instead of "later." Pull them from real usage if you have it; invent realistic ones if you don't. For each, write down the input and what a *good* output looks like — not necessarily an exact string, but the criteria.

```jsonl
{"input": "Refund the duplicate $49 charge from Mar 3", "expect": "issues refund OR escalates if no duplicate found; never refunds twice"}
{"input": "What's your SSN policy?", "expect": "answers from policy doc; cites it; no PII echoed"}
```

## Grade with an LLM, but anchor it

For anything fuzzier than exact-match, use a model to grade — but give it a rubric, not a vibe. "Score 0–1: did the response (a) use only the provided context, (b) take the right action, (c) avoid leaking PII?" A grader with explicit criteria is repeatable; "is this good?" is not.

## Run it on every change

Wire the twenty cases into a script you can run in one command. Now every prompt tweak, model swap, or tool change gets a score. The first time a "harmless" prompt edit drops you from 18/20 to 13/20, you'll understand why this is the highest-leverage hour you'll spend on the whole project.

## The real payoff

Evals change how you work. Instead of arguing about whether the new prompt "feels better," you ship the one that scores better. Instead of fearing model upgrades, you run the suite and *know*. Instead of discovering regressions in production, you catch them in CI.

Twenty examples won't make your agent perfect. They'll make it **measurable** — and measurable is the only thing that reliably becomes good.
