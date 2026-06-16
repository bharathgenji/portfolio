---
title: "Structure Your Agent Handoffs"
date: "2026-06-16"
summary: "Passing one agent's conversation history into the next is the fastest way to poison a multi-agent pipeline — use a structured handoff document instead."
tags: ["agents", "multi-agent", "orchestration"]
status: published
author: "Bharath"
---

When you build a pipeline of agents — one that researches, one that drafts, one that reviews — you have to answer a question most people don't think hard about: what exactly does one agent pass to the next?

The default answer is the conversation history. Agent A finishes; you take its messages array and use it as the starting context for Agent B. This seems reasonable. It's wrong.

## Why conversation history is a bad handoff

A conversation history carries everything: dead ends the agent explored, intermediate tool calls that didn't pan out, self-corrections, retries. All of that is noise from the next agent's perspective. Agent B's job isn't to understand what Agent A went through — it's to pick up and do its specific task.

More concretely: conversation histories are long. An agent that spent 15 steps researching a topic might hand off 15,000 tokens before Agent B has processed a single word of its own task. You've burned most of your context window on someone else's working memory.

The worst failure mode: Agent B inherits Agent A's uncertainty. If Agent A was confused about something and expressed that mid-loop, that confusion doesn't resolve at handoff — it propagates.

## The handoff document pattern

Instead of passing history, require each agent to produce a structured handoff as its final output.

```python
HANDOFF_SCHEMA = {
    "type": "object",
    "properties": {
        "original_goal":   {"type": "string"},
        "work_completed":  {"type": "string"},
        "artifacts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name":        {"type": "string"},
                    "location":    {"type": "string"},
                    "description": {"type": "string"}
                }
            }
        },
        "open_questions": {"type": "array", "items": {"type": "string"}},
        "next_steps":     {"type": "string"}
    },
    "required": ["original_goal", "work_completed", "next_steps"]
}
```

**`original_goal`** — not "what did I do" but "why did I exist." Every downstream agent needs to know the intent, not just the current state. Without it, an agent summarizing research doesn't know what to emphasize.

**`work_completed`** — a clean prose summary written for a peer, not a log of what happened. The agent distills; the next agent doesn't have to reconstruct.

**`artifacts`** — pointers to outputs: files written, records created, API results cached. The downstream agent reads pointers, not raw data it has to re-fetch.

**`open_questions`** — things Agent A couldn't resolve. This surfaces ambiguity explicitly rather than burying it in a half-committed decision the next agent inherits as fact.

## Building Agent B's context from the handoff

Your orchestrator constructs the next agent's context from the handoff document, not from history:

```python
def context_from_handoff(handoff: dict) -> str:
    questions = handoff.get("open_questions", [])
    return f"""You are continuing a task handed off from a prior agent.

Original goal: {handoff['original_goal']}

Work already completed:
{handoff['work_completed']}

Your task: {handoff['next_steps']}
{"Open questions to resolve: " + ", ".join(questions) if questions else ""}
""".strip()
```

Agent B starts clean. It knows what was done, what it needs to do, and where ambiguity lives — without reading thousands of tokens of another agent's reasoning trace.

## The structural benefit

Handoff documents are verifiable. Write a validator that checks required fields before passing control downstream. Log them. Replay any stage by re-injecting the handoff for that stage — no need to re-run the full pipeline to debug step 4 of 6.

A conversation history is a black box that grew organically. A structured handoff is a contract your orchestrator can enforce.

If your agents are already producing structured outputs (and they should be — see [Structured Output Beats Parsing](/playbook/structured-output-beats-parsing)), adding a handoff schema is one more schema definition. The payoff is a pipeline where each agent gets exactly what it needs and nothing it doesn't.
