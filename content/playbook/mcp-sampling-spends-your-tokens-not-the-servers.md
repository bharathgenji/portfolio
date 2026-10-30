---
title: "MCP Sampling Spends Your Tokens, Not the Server's"
date: "2026-10-30"
summary: "An MCP server that asks your client to generate text isn't borrowing a favor — it's spending your model budget, under your rate limit, on a prompt it wrote and you probably never saw."
tags: ["agents", "mcp", "cost"]
status: draft
author: "Bharath"
---

## The feature that reads like a courtesy

MCP's sampling capability lets a server call back into your client and ask it to run a completion — `sampling/createMessage` — instead of holding its own model credentials. The pitch sounds generous: the server doesn't need an API key, doesn't need to pick a provider, doesn't need to manage its own rate limits. Your client already has a model connection open, so the server borrows it.

Read that sentence again from the other side. The server isn't borrowing a favor. It's spending your tokens, on your rate limit, on your invoice, with a prompt it wrote and content it chose to include. The convenience is real. It's just convenient for the server, not for you.

## Where the approval step quietly disappears

The spec gates this with a human-in-the-loop review: the client is supposed to show the proposed prompt before sending it, and the response before returning it, so a person can veto either. That design assumes a human is sitting at a chat client. Most agent deployments aren't that — they're headless, scheduled, or running inside a pipeline where no one is present to click approve. So the SDK's approval hook gets wired to a no-op that always returns yes, or never gets wired at all, and sampling becomes exactly what the spec tried to prevent: a standing authority any connected server has to generate against your model, on demand, unreviewed.

It gets worse with `modelPreferences`. The server can hint at intelligence, speed, and cost priorities for the call — meaning a server you added for one narrow tool can request your most expensive model for a completion you never asked for, and your client will honor the hint unless you've clamped it.

## It also won't show up where you're looking

If your cost and call-volume dashboards count "tool calls per run," sampling requests slip past them — they don't arrive through your tool-dispatch code path, they arrive through the sampling callback, so [[instrument-cost-per-tool-not-per-run]] needs a second meter specifically for this, not just better labels on the one you have.

## What to actually do

Implement the approval hook for real, even headless — at minimum, log the proposed prompt, model, and max tokens before forwarding, so a spike is visible after the fact even without a human in the loop at the time. Clamp `maxTokens` and ignore any `modelPreferences` you don't want honored; don't let a server's hint route itself onto your priciest model. Meter sampling calls against a budget scoped to that specific server, separate from [[give-agents-their-own-rate-limit-pool]] — this is an inbound request spending your pool, not an outbound call you made, and it deserves its own ceiling. And treat the prompt content itself as untrusted input into your model, same as any other handoff ([[untrusted-content-stays-untrusted-across-every-handoff]]) — a server choosing what goes into a sampling prompt is a server choosing what your model reasons over.

Sampling inverts who initiates a model call. The plumbing being automatic doesn't make the spend yours to ignore.
