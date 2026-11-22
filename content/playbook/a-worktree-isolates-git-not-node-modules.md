---
title: "A Worktree Isolates Git, Not node_modules"
date: "2026-11-22"
summary: "Give three coding agents their own worktree and they'll still fight over the one dependency tree you forgot was shared."
tags: ["agents", "multi-agent", "tool-design"]
status: draft
author: "Bharath"
---

## The fix that only moved the race

You've already learned the lesson in [[parallel-coding-agents-need-their-own-worktree]]: one shared checkout means two agents racing on the same index, so you switched to `git worktree add` per agent. Each agent gets its own directory, its own branch, its own `git status`. The filesystem race is gone.

Then one agent's task touches a dependency — bumps a package, adds one, runs the install — and a sibling agent three tasks away starts failing with a module resolution error it has no business hitting. Its diff doesn't touch `package.json`. Its worktree looks untouched. The failure makes no sense until you check where `node_modules` actually lives.

## Worktrees share more than the object store

`git worktree` isolates exactly one thing: the working tree and index that Git itself manages. Everything outside Git's view — `node_modules`, a Python venv, a Cargo `target/` directory, a Gradle build cache — is not tracked by Git and is not duplicated by `git worktree add`. If you set the repo up once and point every worktree's install at a shared cache path (common, because duplicating hundreds of megabytes of dependencies per agent feels wasteful), every agent that runs a package manager is writing into the same directory at the same time.

Package managers are not built for concurrent writers. `npm install` holds no cross-process lock on `node_modules` contents the way a database holds a row lock — two installs running at once can both be mid-write to the same package's files, and the one that finishes first can have its work partially overwritten by the one still unpacking. The failure shows up as a missing or truncated file inside some unrelated package, in a worktree that never asked for a dependency change, minutes or builds after the actual collision happened.

## Scope the dependency tree to the worktree, or gate the install

The honest fix is to let each worktree's install actually be its own:

```python
def spawn_isolated(agent_task, repo_path, branch_prefix):
    worktree_path = make_worktree(repo_path, branch_prefix, agent_task.id)
    run(["npm", "ci"], cwd=worktree_path)  # full install, this tree's own node_modules
    return run_agent(agent_task, cwd=worktree_path)
```

That costs real disk and real install time per agent — on a large monorepo, easily the slowest step in the loop. If that cost is the reason you shared the cache in the first place, don't silently share it; put a mutex around it instead, so agents queue for the install step rather than racing through it:

```python
install_lock = FileLock("/tmp/worktrees/.install.lock")

def install(worktree_path):
    with install_lock:
        run(["npm", "install"], cwd=worktree_path)
```

A queued install is slower than a parallel one but still correct. A parallel install into shared `node_modules` is fast and wrong, and wrong in a way that doesn't announce itself at the install step — it announces itself later, in a different agent's task, as a bug that looks like it has nothing to do with dependencies.

## Audit every path your agents write to that isn't the worktree

The general version of this: `git worktree` only protects paths Git tracks. Before trusting worktree isolation for a given stack, list every mutable path a build or install step touches outside the repo — lockfile-driven caches, compiler output directories, test database files, local object storage emulators — and check whether it's per-worktree or shared by default for that tool. Most package managers default to a repo-relative cache; most of them also let you override it to something shared "for speed," which is precisely the setting that reintroduces the race you thought the worktree had already solved.
