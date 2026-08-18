---
title: "The Prompt Cache Clock Doesn't Stop for Human Approval"
date: "2026-08-17"
summary: "Your agent's prompt cache has a five-minute TTL — and a human sitting on an approval button for six minutes quietly hands you a full-price, full-latency call with no error to explain why."
tags: ["agents", "cost", "human-in-the-loop"]
status: published
author: "Bharath"
---

An agent proposes an action, pauses for human approval, then resumes and executes. Every call before the pause is fast and cheap, because [[cache-your-prompt-prefix]] and the cache is hot. The call right after approval is neither. Same system prompt, same tool definitions, same prefix ordering — and yet it comes back slower and at full input price, with nothing in your logs marked as an error.

The cache didn't get invalidated by a code change. It expired. Anthropic's ephemeral prompt cache lives for five minutes; if the gap between the last call that touched it and the next one exceeds that window, the entry is simply gone. A model call is not what keeps a cache warm — a model call *within the TTL* is. Human approval steps are exactly the kind of gap that blows through five minutes without anyone doing anything wrong: the reviewer was in a meeting, the approval queue batches on a ten-minute cron, someone left the Slack message unread over lunch.

## Why it's invisible in your metrics

Nothing throws. Cost and latency dashboards usually average across a run, so one expensive call buried between nine cheap ones barely moves the mean. It shows up as p99 latency you can't explain, or a monthly token bill that's a little higher than your call-count model predicts. Teams chase this for a while assuming it's a code-path bug before they check the actual gap between the pre-approval and post-approval timestamps.

## Design around the TTL, don't fight it

You can't keep a cache alive indefinitely for an unbounded human wait — sending keep-alive pings every four minutes to refresh a cache that might sit idle for an hour just adds cost on top of cost. Instead, split the prompt so the parts that survive the gap are cheap regardless of what happens to the rest:

```python
messages = [
    {"type": "text", "text": SYSTEM_PROMPT,       # rarely changes
     "cache_control": {"type": "ephemeral"}},
    {"type": "text", "text": TOOL_DEFINITIONS,     # rarely changes
     "cache_control": {"type": "ephemeral"}},
    {"type": "text", "text": pre_approval_scratchpad},  # discard before the wait
    {"type": "text", "text": resumed_task_context},     # rebuilt after approval
]
```

Two things follow from this. First, put separate cache breakpoints after the system prompt and after the tool definitions instead of one breakpoint at the end of everything static — most providers support more than one per prompt. A miss on the whole prefix from a stale TTL still lets you re-cache the truly static blocks on the very next call, instead of paying full price for the same unchanging tokens every time a review takes six minutes. Second, don't carry the pre-approval reasoning trace across the wait at all. It's going to miss the cache anyway once the TTL lapses, so paying to recompute it is pure waste — summarize it into the decision that was actually approved and drop the rest, the same discipline as a [[structure-your-agent-handoffs]] document, just applied across a human pause instead of an agent-to-agent one.

## The number that actually matters

Don't budget cost per call. Budget cost per call *conditioned on the gap since the last call*. If your approval SLA is a median of two minutes with a long tail past five, you have two cost profiles hiding inside one average, and only one of them is a caching win.
