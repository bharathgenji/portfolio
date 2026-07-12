---
title: "Mint Scoped Credentials Per Tool Call, Not Per Agent"
date: "2026-07-12"
summary: "The agent process holding one long-lived, do-everything API key is the credential equivalent of passing every tool to every phase — and it fails the same way."
tags: ["agents", "security", "tool-design"]
status: draft
author: "Bharath"
---

## The credential that outlives its purpose

Most agent backends have one service account. The process boots, loads a database credential and a payments API key from the environment, and holds them for the lifetime of the run — sometimes the lifetime of the process. Every tool call, from `read_order_history` to `issue_refund`, authenticates as the same identity with the same blast radius.

This works fine until something goes wrong: a prompt injection steers a tool call, a bug in your loop retries an action twelve times, or a compromised dependency reads environment variables. When it does, the damage ceiling isn't "what this one tool call should be able to do" — it's "everything that service account can do," which in practice is everything.

Tool scoping (deciding *which* tools a phase can call) gets attention. Credential scoping — deciding what *authority* each call actually authenticates with — usually doesn't, because it's more work to wire up. It's the more important of the two.

## Mint per call, don't hold per process

Instead of loading one static credential at boot, put a broker between your tool executor and your credential store. The executor requests a token scoped to exactly this call, right before making it:

```python
def execute_tool(tool_name: str, args: dict, run_id: str) -> dict:
    grant = credential_broker.mint(
        principal=f"agent-run:{run_id}",
        scope=TOOL_SCOPES[tool_name],       # e.g. "orders:read"
        ttl_seconds=30,
        resource_id=args.get("order_id"),   # narrows to one row, not the table
    )
    try:
        return registry[tool_name].run(args, credential=grant)
    finally:
        credential_broker.revoke(grant)
```

`issue_refund` gets a token scoped to `payments:refund` on one order ID, valid for 30 seconds, revoked the instant the call returns. `read_order_history` gets a read-only token on the same order. Neither can touch anything outside its call, and neither outlives it.

## What this actually buys you

**A leaked token is worthless within a minute.** A 30-second TTL means exfiltrating the credential is a race against a clock you control, not a permanent foothold.

**Injection damage is capped at one call's scope**, not the service account's. A hijacked tool call can still do something bad, but "something bad within `orders:read` on order 4471" is a bounded incident, not an open-ended one.

**Your audit log becomes precise for free.** Every grant is tied to a `run_id`, a scope, and a resource. When something goes wrong, you don't ask "which of our credentials might have caused this" — you look up exactly which grant existed at the timestamp in question.

## Where to stop

Don't mint a credential for every tool including read-only, side-effect-free ones that never touch sensitive data — that's overhead without a corresponding risk reduction. Reserve per-call minting for tools that write, delete, spend money, or send anything externally. Same triage list you'd use for [[give-agent-actions-a-compensating-action]]: if the action is irreversible or costs something, the credential behind it should be as short-lived and narrow as the call itself.
