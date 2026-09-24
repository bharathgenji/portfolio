---
title: "An MCP OAuth Token Can Expire Mid-Run"
date: "2026-09-24"
summary: "The token your agent used to connect an hour ago isn't the token it's using now — and most MCP clients only find out when a tool call already failed."
tags: ["agents", "mcp", "reliability"]
status: draft
author: "Bharath"
---

## The research agent that quietly stopped reading

A background research agent connected to a Google Drive MCP server at the start of a run, spent the first twenty minutes pulling documents productively, then spent the remaining forty returning "no relevant documents found" for queries that should have hit dozens of files. Nobody had revoked access. Nothing had changed in the corpus. The access token negotiated at connection time had a 60-minute TTL, it expired forty minutes in, and the MCP client's error handling caught the resulting 401, treated it as an empty result set, and moved on. The agent didn't fail. It just quietly ran the second half of a research task with a broken tool it believed was working.

This is a specific failure mode of the more general one in [[long-running-agents-dont-know-you-redeployed-their-tools]]: something about the environment changed after the session started, and nothing told the agent. OAuth makes it worse than a schema change, because the failure mode isn't a loud validation error — it's a 401 that's trivially easy to swallow into "no results," and swallowing auth errors into empty success is exactly the anti-pattern [[stateful-tools-need-sticky-sessions]] warns about for expired sessions in general.

## Why this is easy to ship by accident

Most MCP client code is written and tested against short runs — a few tool calls, a few minutes, well inside any reasonable token TTL. The OAuth handshake happens once at connection, the token gets cached in memory, and every call after that just uses it. That code path works perfectly until a run crosses the TTL boundary, which for interactive sessions might be rare, but for autonomous or overnight agents is close to certain. Nobody wrote a bug. Nobody tested the one-hour-plus case, because the one-minute case looked done.

## Refresh proactively, don't wait for the 401

Track the token's expiry alongside the connection, not just the token itself, and refresh ahead of the deadline instead of reacting to a failed call:

```python
def get_valid_token(conn: MCPConnection) -> str:
    if conn.token_expires_at - now() < timedelta(seconds=60):
        conn.token = refresh_token(conn.refresh_token)
        conn.token_expires_at = now() + conn.token.ttl
    return conn.token.access_token
```

The 60-second margin matters — refreshing exactly at expiry still races a slow tool call that reads the old token a moment before it's replaced.

## When refresh fails, say so loudly

Refresh tokens expire too, or get revoked, or the underlying account loses access mid-run. When refresh itself fails, don't let the tool call fall through to "no results" — return a typed error the agent can act on:

```python
{"error": "auth_expired", "message": "Google Drive access expired and could not be refreshed. Re-authorization required before retrying this tool."}
```

An agent that sees `auth_expired` can stop, surface the problem, or hand off to a human for re-auth. An agent that sees an empty result list concludes the corpus is empty and reports findings based on half the data, with no indication in the transcript that anything went wrong — which is the worse outcome, because it looks like a normal, confident answer.

## Test the boundary, not just the happy path

If your MCP-connected agents ever run longer than the shortest token TTL in your stack, add one eval that holds a connection open past that TTL and asserts the next call either succeeds via silent refresh or fails loudly — never silently. That single test would have caught the research agent's forty minutes of confident nonsense before a person had to notice the report looked thin.
