---
title: "Parallel Coding Agents Need Their Own Worktree"
date: "2026-08-14"
summary: "Two agents editing the same checkout at once don't conflict like two humans do — they silently stomp each other's uncommitted changes with no merge conflict to even alert you."
tags: ["agents", "multi-agent", "tool-design"]
status: published
author: "Bharath"
---

## The diff that lost half its lines

You fan out three coding agents against the same repo checkout to fix three unrelated bugs in parallel — faster than doing it sequentially, and the bugs don't touch the same files, so it looks safe. An hour later the PR for bug one is missing changes you watched the agent make. Nothing errored. No merge conflict fired. The agent's own transcript says it edited the file and even shows the diff.

What happened: all three agents were writing into one working directory. Agent B ran `git status` and `git diff` to orient itself mid-task, which is harmless. But somewhere in its loop it also ran a `git checkout` on a file to discard a bad edit, and that checkout landed *after* Agent A had already modified the same file for an unrelated reason — same working tree, same index, no lock between them. Git's working tree and staging area are one shared mutable resource. Two agents pointed at it aren't running in parallel, they're racing, and the race isn't between conflicting hunks of the same feature — it's between two agents who don't know the other exists and have no reason to check.

This is the filesystem version of [[parallel-tool-calls-need-a-concurrency-story-for-writes]]. The tools looked independent — three different bug fixes — but they shared state underneath that the model can't see and wouldn't reason about even if it could.

## Give each agent its own tree, share the object store

`git worktree` exists for exactly this: multiple working directories checked out from branches of the same repository, sharing one `.git` object database, with zero risk of one working tree's index operations touching another's files.

```python
def spawn_isolated(agent_task, repo_path, branch_prefix):
    branch = f"{branch_prefix}-{agent_task.id}"
    worktree_path = f"/tmp/worktrees/{branch}"
    subprocess.run(
        ["git", "worktree", "add", "-b", branch, worktree_path, "HEAD"],
        cwd=repo_path, check=True,
    )
    try:
        return run_agent(agent_task, cwd=worktree_path)
    finally:
        if not has_changes(worktree_path):
            subprocess.run(["git", "worktree", "remove", worktree_path], cwd=repo_path)
```

Each agent gets a real directory, a real branch, a real `git status` that only reflects its own work. Nothing it does — checkout, stash, reset — can touch what another agent is doing, because there's no shared index left to touch.

## Don't pay for it unconditionally

Worktree creation isn't free — it's a filesystem checkout plus a branch, on the order of hundreds of milliseconds and real disk per agent. If your agents are read-only (search, review, analysis) or genuinely touch disjoint files with no shell access to run arbitrary git commands, a shared checkout is fine and worktrees are wasted setup cost. Reach for isolation specifically when agents *write* and run tools broad enough to affect more than the files they were assigned — which in practice means almost any agent with real shell access, since `git checkout .` doesn't know it's only supposed to affect one bug fix.

Clean up worktrees that produced no changes rather than leaving them to accumulate — an agent that read code, decided no fix was needed, and exited shouldn't leave a stale branch and directory behind for the next person to puzzle over.

## Merge once, at the boundary you control

The other benefit is where conflicts surface. With a shared checkout, a real conflict between two agents' edits doesn't raise a merge conflict — it's just one write clobbering another, silently, because there's no version being compared. With separate worktrees and branches, two agents that genuinely touched the same file long enough to conflict will conflict at merge time, where you have a diff, a base, and a human or a review agent positioned to resolve it — instead of upstream, invisibly, where the only symptom is a diff that's smaller than the transcript says it should be.
