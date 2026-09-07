---
title: "Two MCP Servers Can Both Name a Tool 'search'"
date: "2026-09-07"
summary: "Connect a second MCP server with a tool name your first one already uses, and the client resolves the collision for you — silently, and not necessarily the way you'd pick."
tags: ["agents", "mcp", "reliability"]
status: draft
author: "Bharath"
---

## The wrong search ran, and nothing errored

An agent had two MCP servers wired in: an internal docs server and a freshly added Linear connector, both exposing a tool called `search`. The agent asked for "search for the auth timeout ticket" and got back API documentation instead of a Linear issue. No exception, no malformed call, no obviously wrong tool name in the trace — the model called `search` exactly as instructed, and `search` did exist. It just wasn't the one anyone meant.

MCP servers don't coordinate with each other. Each one declares its own tool names in isolation, unaware that another server in the same session might reuse the same word. `search`, `list`, `get`, `query`, `run` — these are the first names anyone reaches for, and generic connectors converge on them constantly. Nothing in the protocol stops two servers from both claiming the same name in the same client.

## Where the collision actually gets resolved

Something still has to pick one tool when the model calls `search`, and that resolution happens in your MCP client, not in the model and not in the protocol. Depending on the client, that might mean last-registered-wins, first-registered-wins, or a hard rejection at connection time. None of these is "the client understood which search you meant" — it's whichever tiebreak rule the client author picked, usually undocumented, sometimes different between minor versions.

That's the real risk. A behavior driven by connection order rather than by anything semantic will look correct through weeks of testing — your servers happen to connect in a stable order — and then flip the moment you add a third server, reorder your config, or the client library upgrades its resolution logic. You won't get a stack trace for this. You'll get a plausible-looking result from the wrong data source, exactly the failure mode that's hardest to catch in review because nothing about the output *looks* broken.

## Namespace at the client, don't trust servers to avoid the word

Prefix every tool by its server at load time, before the list reaches the model, the same way you'd prefix environment variables to avoid collisions between two config sources:

```python
def load_namespaced(server_id: str, client: MCPClient) -> list[dict]:
    tools = client.list_tools()
    for tool in tools:
        tool["name"] = f"{server_id}__{tool['name']}"
    return tools
```

`linear__search` and `docs__search` can't collide, and the prefix doubles as a hint to the model about which corpus it's about to query — genuinely useful when both tools show up in the same candidate set. Do this even if you're only running one server today; the second server always arrives later than you planned, usually mid-sprint, from whoever just found a connector they want wired in fast.

## Check for it before it ships, not after

Add a startup assertion that raises on any duplicate raw tool name across your configured servers, before namespacing masks it. That's a five-line check against your full loaded tool list, and it turns a silent misrouted call into a loud failure at boot — the same trade [[pin-your-mcp-tool-descriptions-like-a-lockfile]] makes for tool descriptions that change out from under you. A collision caught at connection time costs you a config edit. A collision caught by a user noticing the wrong data costs you the investigation to figure out why it ever worked at all.
