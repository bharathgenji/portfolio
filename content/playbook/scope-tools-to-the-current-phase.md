---
title: "Scope Each Phase to the Tools It Actually Needs"
date: "2026-06-13"
summary: "Passing every tool to every agent call is convenient and a silent liability — scope tool sets to phases and you get injection safety, focused reasoning, and sharper traces for free."
tags: ["agents", "reliability", "security"]
status: draft
author: "Bharath"
---

## The Loaded Weapon Problem

Most agent code collects every tool the agent might ever need and passes the full set to every model call. This is a natural first step. In demos, it's fine.

In production, it's a liability.

Consider a typical research-then-write agent. Research needs `web_search`, `read_file`, `fetch_url`. Writing needs `write_file`, `send_email`, `update_database`. The standard approach passes all six to every LLM call. That means during the research phase — when you're actively ingesting untrusted external content — the model is holding live write tools.

One successful prompt injection in a web page you're summarizing, and you have an unwanted database write or an outbound email you didn't authorize.

## The Subtler Problem

Even when injection isn't the concern, wide tool sets hurt agent quality.

Every tool in the schema is a decision the model can make. More options mean more noise. A model reasoning over ten tools will occasionally make lateral calls — fetching a file it doesn't need, retrying a search for unclear reasons — simply because those paths are available. Narrow the option space and you get more focused, easier-to-trace behavior.

Agents given fewer choices hallucinate less about which choice to make.

## Phase-Scoped Tool Sets

The fix is simple: define which tools each phase is allowed to call, and pass only those.

```python
TOOL_SETS = {
    "research": [web_search, read_file, fetch_url],
    "draft":    [read_file, write_scratch],
    "publish":  [read_scratch, send_email, update_database],
}

def run_phase(phase: str, messages: list) -> str:
    return client.messages.create(
        model="claude-sonnet-4-6",
        tools=TOOL_SETS[phase],
        messages=messages,
    ).content[0].text
```

Now the research phase structurally *cannot* write to the database, even if it tries. The constraint is in the schema, not in a system prompt instruction that can be reasoned around.

If your agent already separates planning from execution, adding per-phase tool sets is a one-line change per phase. If it doesn't, this is a good reason to start.

## What You Get

**Safety by construction.** A read-only phase with read-only tools cannot cause side effects regardless of what the model decides or what injection it encounters. You're not relying on the model to behave — you're relying on the API to reject the call.

**Sharper reasoning.** Fewer tools means a smaller decision space. Agents constrained to what they actually need behave more predictably and are significantly easier to eval because the space of possible actions per phase is bounded.

**Faster debugging.** When a tool call looks wrong, you immediately know which phase it came from — and which phases it *couldn't* have come from. That bound is valuable when you're reading a trace at midnight.

## The Rule

If a phase doesn't need a tool, it shouldn't have it. Not "it probably won't use it" — *it shouldn't have it*. Permissions that aren't granted can't be abused.

This is a thirty-year-old principle from operating systems applied to LLM agents. It keeps appearing in access control, microservices, and agent design because scoping to minimum necessary permissions is one of the few defenses that holds even when everything else goes wrong.
