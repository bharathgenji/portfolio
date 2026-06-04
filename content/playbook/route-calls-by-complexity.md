---
title: "Most agent steps don't need your best model"
date: "2026-06-04"
summary: "Running every call in your agent loop through the same expensive model is the most common production cost mistake — and the fix is structural, not clever."
tags: ["agents", "cost", "latency"]
status: draft
author: "Bharath"
---

Every call in an agent loop isn't equal. Some steps require real reasoning — synthesizing conflicting evidence, generating non-trivial code, navigating ambiguous requirements. Others are mechanically simple: "does this response contain an error?", "which category does this query fall into?", "extract the account ID from this message."

Running all of them through your most capable model is the most common production mistake I see. It's like hiring a principal engineer to check a checkbox.

## The anatomy of a typical agent run

A support agent I profiled recently made 10 model calls per run:

- 4 calls: intent routing ("billing question or technical?")
- 3 calls: structured extraction ("pull the account ID from this message")
- 2 calls: retrieval grading ("does this doc chunk answer the question?")
- 1 call: response synthesis — actual complex reasoning

Nine out of ten calls were tasks a fast, cheap model handles identically. One needed the expensive model. Every call was hitting the same model because it was the default.

## Route structurally, not dynamically

The simplest fix: hardcode which *step types* get which model. Don't add a dynamic routing layer — that's another LLM call that eats into your savings.

```python
CHEAP = "claude-haiku-4-5"
MAIN  = "claude-sonnet-4-6"

def classify_intent(message: str) -> str:
    return llm(CHEAP, f"Classify as billing/technical/other: {message}")

def grade_retrieval(query: str, chunk: str) -> bool:
    return llm(CHEAP, f"Does this chunk answer: {query}? Reply yes or no.\n\n{chunk}")

def synthesize_response(context: str, history: list) -> str:
    return llm(MAIN, build_synthesis_prompt(context, history))
```

Certain step types are cheap by definition. Make that explicit in the code rather than discovering it at billing time.

## What cheap models actually handle well

Fast models (Haiku, Gemini Flash, GPT-4o-mini) are reliable for:

- JSON extraction from structured text
- Intent classification into predefined categories
- Boolean checks and format normalization
- Routing decisions with explicit criteria

They degrade on multi-step reasoning, long-context synthesis, and anything requiring nuanced judgment. The boundary is sharper than most people expect. Run your eval set through both models on extraction tasks and you'll often find zero quality difference — the only delta is cost and latency.

## The actual numbers

Haiku costs roughly 15x less than Sonnet per token. If 70% of your agent's calls are simple tasks, routing those to the cheaper model cuts per-run cost by ~65% with no quality regression. At 50,000 runs/month, that's not a rounding error.

Latency compounds too. Cheap models respond 3–5x faster. In a multi-step loop, that stacks across every turn.

## One thing to watch

Don't overthink the routing. If you find yourself writing a general "rate this task's complexity" classifier that runs before every call, you've added overhead that may erase the savings. The better design is step-level model assignment baked into the architecture — each function knows its own tier.

The principle: every LLM call should cost exactly as much as the complexity of the work it's doing. Most agents wildly overpay for the easy steps.
