---
title: "Version Your System Prompts Like Code"
date: "2026-06-22"
summary: "A prompt change is a deployment — treat it like one or keep getting burned by invisible regressions."
tags: ["agents", "reliability", "evals"]
status: published
author: "Bharath"
---

## The silent deployment

You wouldn't push a code change without a PR. But last Tuesday, someone edited the system prompt in your staging database, tested it manually on three examples, and promoted it to production. The agent started refusing edge cases it used to handle fine. Nobody noticed for six hours.

Prompt changes are deployments. They change your agent's behavior as surely as changing its code. The engineering practices that protect code changes — version control, review, regression testing, staged rollout — apply equally here.

## Store prompts as files

The worst place to keep a system prompt is a row in a database. You lose history, diffs, and the ability to tie a prompt version to a deploy. The second worst place is an embedded string in application code — it couples prompt evolution to code releases and buries meaningful changes in noisy commits.

Store prompts as `.md` files in your repository, loaded at startup. One file per agent, named after it:

```
prompts/
  research-agent.md
  summarizer.md
  planner.md
```

Now prompt changes go through your normal PR process. You get history, blame, and clean rollbacks via `git revert`. A reviewer can read the diff and understand exactly what changed in the agent's behavior.

## Gate on evals before merge

A prompt change that passes vibes-testing and breaks production is a solved problem — you just didn't have evals. Before any prompt change lands in `main`, run your eval suite against it in CI:

```bash
python evals/run.py \
  --prompt prompts/research-agent.md \
  --fixtures evals/fixtures/research-agent/ \
  --min-pass-rate 0.90
```

The suite doesn't need to be exhaustive. Your [twenty canonical cases](/playbook/start-with-twenty-evals) cover the behaviors that matter. A prompt that passes 17/20 cases it used to pass 20/20 is a regression worth investigating before it ships. Merge it anyway and you're just doing manual QA in production with real users.

## Never change prompt and model together

If you update the system prompt and switch model versions in the same commit, and behavior regresses, you can't tell which change caused it. Keep prompt changes and model upgrades separate. This is the same discipline as infrastructure changes: one variable per deploy.

It also protects your rollback path. If you ship a new prompt and need to revert, you want `git revert` to cleanly restore the previous behavior — not a tangled commit that also changed the model, the tool definitions, and two other things.

## Shadow before you commit

For high-stakes agents, run the new prompt in shadow mode before full rollout: route real traffic through both versions, log both outputs, compare them without serving the new version to users. One day of shadow traffic will surface edge cases that months of eval writing might miss.

The infra is simpler than it sounds. Route each request to both prompt versions, log the response pair with a shared trace ID, and review diffs. A single environment variable controls which version actually serves responses. You're not building a feature flag system — you're just logging more.

## The rule

Treat every system prompt change like a code deployment: version it, review it, eval it, roll it out incrementally. The one time you skip this is the one time your agent starts apologizing to users in a loop instead of helping them.
