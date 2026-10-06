---
title: "Not Everything MCP Exposes Should Be a Tool"
date: "2026-10-06"
summary: "MCP gives you resources and prompts alongside tools, but most servers skip them — then rebuild polling and context bloat the hard way with tool calls."
tags: ["agents", "mcp", "tool-design"]
status: draft
author: "Bharath"
---

## The server that only had a hammer

A team building an MCP server for their internal docs platform shipped three tools: `list_docs`, `read_doc`, `search_docs`. Reasonable on paper. In practice, every agent session opened with the same three or four calls — list the handbook pages, read the two that looked relevant, search for a term that didn't show up in either. That's 4-6 round trips and a few thousand tokens of tool-call scaffolding spent just to get the agent looking at the same five onboarding docs it needed in the last ten sessions too.

MCP has a primitive for exactly this, and the team wasn't using it. Resources let a server expose content by URI that the *host* attaches to context directly — no model turn spent deciding to call anything, no round trip, no tool-call token overhead. Tools are for actions the model decides to take. Resources are for content a human or host already knows is relevant. Conflating the two is why that docs server was burning calls on something that should have been a handbook pinned to the conversation before the agent said a word.

## Three primitives, three different controllers

MCP's spec splits capabilities by *who decides to invoke them*, and that split is the whole point:

- **Tools** — model-controlled. The agent decides when to call `search_docs` based on what it's reasoning through. Right for anything where the need is genuinely conditional on the conversation.
- **Resources** — application-controlled. The host (your orchestrator, your IDE, your chat UI) decides what to attach, often before the model ever runs. Right for content whose relevance you already know: the active file, the on-call runbook, the customer record the support rep already pulled up.
- **Prompts** — user-controlled. A human explicitly picks `/triage-incident` from a menu, and the server fills in a templated prompt. Right for workflows a person kicks off deliberately, not ones the model improvises into existence.

A server that implements only tools forces every one of these into the model's decision loop, even the ones that were never actually a model decision. The handbook page your agent reads on literally every session isn't a judgment call — it's a known dependency. Serve it as a resource, attached at session start, and you've cut the tool-call tax to zero for that path while keeping it for genuinely conditional lookups.

## The subscription you're reinventing with polling

Resources also support `resources/subscribe`: the host asks to be notified when a resource changes, and the server pushes an update instead of the agent polling a `check_for_updates` tool every few turns. If you've built a tool whose entire job is "has X changed since I last looked," you've built a worse version of a primitive that already exists and already handles the notification plumbing for you.

## Where this actually matters

Below a handful of static, known-relevant pieces of content, don't bother — passing them as part of your system prompt setup is simpler than standing up resource handlers. This pays off once a server has enough fixed, predictable context (docs, configs, active records) that routing it through tool calls is visibly wasteful in your traces: the same lookup, every session, at the same point in the flow.

## The tell

If your MCP server's tool list includes something an agent calls on nearly every run, in nearly the same way, with no real decision behind it, you've built a tool for something that was never a model's choice to make. Move it to a resource. The model wasn't deciding anyway — it was just paying for the illusion that it was.
