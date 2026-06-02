---
title: "Independent tool calls should run in parallel. Most don't."
date: "2026-06-02"
summary: "When your agent needs three independent pieces of data, there's no reason to fetch them one at a time — except nobody told it not to."
tags: ["agents", "latency", "tool-calling"]
status: draft
author: "Bharath"
---

When a model decides it needs multiple tools, its default is to call them one at a time: call tool A, get the result, call tool B, get the result, call tool C. Each round-trip is 200–800ms. For three tools, you're looking at up to 2.4 seconds of pure waiting.

If those tools are independent — fetch the user profile, query the order history, check account balance — there is no reason to do them sequentially. You can issue all three in a single round-trip. Most models support this. The catch is you have to set it up.

## How parallel tool calls work

The model emits multiple tool calls in a single response. You execute them concurrently, collect all results, and return them together before the model continues reasoning.

```python
tool_calls = response.tool_calls  # [lookup_user, get_orders, check_balance]

results = await asyncio.gather(*[
    execute_tool(tc.name, tc.arguments)
    for tc in tool_calls
])

messages.append({
    "role": "tool",
    "content": [
        {"tool_use_id": tc.id, "content": str(result)}
        for tc, result in zip(tool_calls, results)
    ]
})
```

The model matches results by ID. Your only job is to not serialize the execution. If you're dispatching calls in a loop with `await` inside it, you're doing this wrong.

## The prompt nudge that actually helps

Models default to sequential step-by-step reasoning — it's how they were trained. One line in the system prompt changes behavior noticeably:

> "When multiple tools can answer different parts of a question independently, call them at the same time rather than sequentially."

Simple, but it works. Without it, many models will dutifully fetch things one at a time even when there's no dependency between them.

## Design tools to expose parallelism

A single fat `get_user_context` tool that internally fetches profile, orders, and preferences in sequence gives the model no opportunity to split the work. Three narrow, single-purpose tools do.

This is one of the real reasons to prefer focused tools over broad ones: each becomes a schedulable unit. A tool that does three things is serial by construction, regardless of how fast your executor is.

## Know when sequential is correct

Parallel isn't always right. If tool B needs tool A's output — you look up an order ID before fetching its line items — they must run in sequence. Let that dependency govern the design. If you find yourself always chaining A → B in practice, consider merging them into one tool that takes the upstream input directly.

The rule is simple: parallel when independent, sequential when one output feeds the next. Drawing the dependency graph for your tool set will also surface which tools should probably be merged.

## The real numbers

Five independent fetches at 400ms each: sequential is 2 seconds, parallel is 400ms. For a customer support agent handling thousands of sessions daily, that 1.6-second gap compounds into real infrastructure cost and measurably faster first responses.

The implementation is cheap — a `gather()` call and one line of prompt. The default sequential behavior is just an artifact of how models reason. You can override it.
