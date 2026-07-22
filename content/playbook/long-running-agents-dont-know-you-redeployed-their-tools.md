---
title: "Long-Running Agents Don't Know You Redeployed Their Tools"
date: "2026-07-22"
summary: "A tool schema is part of the conversation the moment it's sent — change it under a session that's still running and you get malformed calls, not a clean upgrade."
tags: ["agents", "reliability", "deployment"]
status: draft
author: "Bharath"
---

## The deploy that broke sessions nobody was watching

You ship a small fix: `create_ticket` used to take a free-text `priority` string, now it's a strict enum — `low | medium | high`. Tests pass. New sessions work fine. Then support pages you about a backlog of tool calls failing validation with `priority: "urgent"` — a value that was never valid under the new schema, but was perfectly reasonable under the old one, and the agents producing it started their sessions six hours before the deploy.

Nothing about your deploy process was wrong. The bug is that a tool schema isn't a static contract sitting in your codebase — it's data that gets baked into a specific conversation the moment the model first sees it, whether in the system prompt, the tools array, or a few-shot example of a prior call. A session that's been running since before your deploy is still reasoning against the *old* schema in its own context, even though your backend now validates against the new one. The model isn't malfunctioning. It's being consistent with evidence you handed it hours ago and then silently invalidated.

## Pin the schema version to the session, not the deploy

Treat tool schemas like you'd treat an API contract with an external caller — because that's what a long-running agent session is.

```python
def start_session(user_id: str) -> Session:
    return Session(
        id=new_session_id(),
        tool_schema_version=CURRENT_TOOL_SCHEMA_VERSION,  # pinned at creation
        ...
    )

def validate_tool_call(session: Session, tool_name: str, args: dict):
    schema = get_schema(tool_name, version=session.tool_schema_version)
    return schema.validate(args)
```

New sessions pick up `CURRENT_TOOL_SCHEMA_VERSION` automatically. Sessions already in flight keep validating against whatever version they started with, so an in-progress agent never gets a rug pull mid-task. Deploy the new schema and the new code path together, but let old sessions drain against the old one.

## When you can't run two schema versions at once

Sometimes the change is a backend requirement, not a preference — the old schema allowed a state your database can no longer represent. In that case, don't let the session silently keep failing. Detect the version mismatch explicitly and force a re-plan:

```python
if session.tool_schema_version != CURRENT_TOOL_SCHEMA_VERSION:
    return {
        "error": "schema_updated",
        "message": "create_ticket's priority field changed to an enum "
                    "(low/medium/high). Re-issue this call with a valid value.",
    }
```

A structured error the model can read and correct beats a validation exception it can't. This is the same principle as [[return-errors-to-your-agent-dont-throw-them]] — the difference is the cause is your own deploy, not the outside world.

## The cache tax nobody budgets for

If your tool definitions live in a cached prompt prefix ([[cache-your-prompt-prefix]]), every schema change is a forced cache miss for every session that touches it — not just new ones. Roll out tool schema changes on a deliberate cadence, the same way you'd version a public API, and watch your cache hit rate the day you ship one. A schema change that looks free in code review can quietly double your token spend for a day if it lands during peak session volume.

Tool schemas are part of your agent's runtime state, not just its config. Version them accordingly.
