---
title: "A Tool Call and Its Result Are One Unit"
date: "2026-07-24"
summary: "Truncate or compact a message history by raw index instead of by turn, and you'll eventually split a tool_use from its tool_result — and the API will reject the very next call."
tags: ["agents", "reliability"]
status: draft
author: "Bharath"
---

## The 400 that shows up a week after the feature ships

Everything works in testing. Then in production, on a run that happened to hit your token budget mid-conversation, the next API call fails with something like `tool_use ids were found without tool_result blocks immediately after them`. Nothing about your tool logic changed. What changed is that your truncation or compaction step cut the message array at an index that fell between a tool call and its result.

Both the Anthropic and OpenAI messages formats encode a tool call as a pair: the assistant turn that contains the `tool_use` block (or `tool_calls` array), and the following turn that contains the matching `tool_result` (or `role: "tool"` message with the same id). The API doesn't treat these as two independent messages you can keep or drop separately — it treats them as one logical unit, and it validates that every `tool_use` id has a corresponding result before it. Most generic message-history code — sliding-window truncation, a token-budget trimmer, a summarizer that collapses "the middle N messages" — operates on messages as an undifferentiated list. It has no idea that message 14 and message 15 are actually one thing.

## Where it actually breaks

The failure isn't limited to trimming old history. It shows up anywhere your agent makes **parallel** tool calls in a single turn: one assistant message can contain three `tool_use` blocks, and all three need a `tool_result` before the next assistant turn is valid — even if one of those three calls timed out or errored. If your timeout handling (see [Timeout Every Tool Call](/playbook/timeout-every-tool-call)) drops the failed call instead of returning an error result for it, you've created the same broken pair, just without any truncation involved.

## The fix: truncate by turn, not by index

Treat "one assistant message plus every tool result it's waiting on" as the atomic unit your history operations are allowed to touch.

```python
def group_into_turns(messages: list[dict]) -> list[list[dict]]:
    turns, i = [], 0
    while i < len(messages):
        msg = messages[i]
        if msg["role"] == "assistant" and has_tool_calls(msg):
            pending = tool_call_ids(msg)
            group = [msg]
            i += 1
            while i < len(messages) and pending:
                pending -= {tool_result_id(messages[i])}
                group.append(messages[i])
                i += 1
            turns.append(group)
        else:
            turns.append([msg])
            i += 1
    return turns
```

Truncate, summarize, or window over the list of *groups*, never the flat list of messages. A compaction pass (see [Compact Your Agent's Context Before It Fills Up](/playbook/compact-agent-context-mid-run)) that summarizes "everything before step 20" is safe once it operates on whole turns — it can drop group 3 entirely, but it can never keep half of it.

## The rule

If your history manipulation code doesn't know what a `tool_use_id` is, it isn't safe to run on a conversation that uses tools — no matter how generic and reusable it looked when you wrote it for plain text messages.
