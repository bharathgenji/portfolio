---
title: "An Elicitation Request Doesn't Know If Anyone's Listening"
date: "2026-11-24"
summary: "MCP's elicitation capability lets a server pause mid-tool-call and wait for a human to answer — wire it into a headless pipeline and the wait never ends."
tags: ["agents", "mcp", "reliability"]
status: draft
author: "Bharath"
---

## The run that hung for six hours, not six seconds

A scheduled pipeline called an MCP-backed deployment tool overnight. The tool needed a decision partway through — which of two conflicting config values to keep — so, per spec, the server issued an `elicitation/create` request back to the client instead of guessing. The client dutifully forwarded it. There was no human on the other end; the pipeline runs unattended at 2am. The request sat open. No error, no timeout, no retry — the SDK's elicitation handler was implemented correctly, which meant it did exactly what it was built to do: wait for a response. It got one six hours later, when someone noticed the run hadn't finished and manually answered a prompt they didn't know existed.

## This is a different blocking surface than the ones you've already guarded

Elicitation is MCP's mechanism for a *server* to pause a tool call and ask the *client's user* a question mid-execution — confirm a destructive action, supply a missing parameter, pick between ambiguous options. It's negotiated as a capability at session init, the same way sampling is ([[mcp-sampling-spends-your-tokens-not-the-servers]]). But sampling spends your model budget; elicitation spends wall-clock time waiting on a human, and the spec places no ceiling on that wait. If you've already built a `clarify` tool for your own agent ([[give-your-agent-a-clarify-tool-not-a-guess]]), it's tempting to assume the risk is covered. It isn't — that tool is something *you* designed, with a budget and a threshold you control. Elicitation is a request a *third-party server* can issue, on its own schedule, inside a tool call you thought was synchronous.

## Capability negotiation answers a different question than "can anyone respond"

Your client SDK asks, at handshake time, "do you support elicitation?" and if you say yes, any connected server can now issue blocking prompts through you. That question is about protocol support, not about whether a human is actually watching the channel at the moment the request arrives. A chat UI with a person in front of it and a cron-triggered batch job can both answer "yes, I support elicitation" during setup — and only one of them can actually resolve the request before your downstream timeout, your orchestrator's retry policy, or your on-call's patience runs out.

## What to actually do

**Don't advertise elicitation support in unattended contexts.** If a run has no human who could plausibly answer within your SLA, declare the capability as unsupported in the client handshake. A spec-compliant server will proceed without the extra input or fail the tool call outright — both are states you can catch and handle. A server that blocks indefinitely on a capability you shouldn't have granted is not.

```python
client_capabilities = {
    "elicitation": is_attended_session(run_context),
}
```

**Where you do support it, wrap every pending request in your own timeout and default.** The protocol won't do this for you.

```python
async def handle_elicitation(request, timeout_s=120):
    try:
        return await asyncio.wait_for(prompt_user(request), timeout_s)
    except asyncio.TimeoutError:
        return {"action": "decline"}  # deny-by-default for anything with side effects
```

**Default to decline, not accept, on timeout.** A silently-approved destructive action because nobody answered in time is worse than a tool call that fails loudly and gets retried with a human actually present.

## The rule

Elicitation capability describes what your client can forward, not who's there to answer. Grant it only where someone demonstrably is — and when you do grant it, put the timeout on the clock yourself, because the server issuing the request has no reason to and the spec doesn't require it.
