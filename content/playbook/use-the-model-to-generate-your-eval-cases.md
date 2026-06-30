---
title: "Use the Model to Generate Your Eval Cases"
date: "2026-06-30"
summary: "Writing eval cases by hand doesn't scale — but the model knows your agent's failure modes better than you do."
tags: ["agents", "evals", "testing"]
status: published
author: "Bharath"
---

Twenty evals gets you started. It doesn't get you to confidence.

Real coverage means hundreds of cases: edge cases, adversarial inputs, ambiguous queries, format variations, multi-step traps. Writing those by hand is slow. Your intuition is also biased — you'll reach for cases you can easily imagine failing, not the ones your agent will actually fail on in production.

The fix: use the model to generate your eval suite.

## The Basic Pattern

Give the model your agent's system prompt, a description of the task, and a few example cases. Ask it to generate more — but bias explicitly toward cases that stress-test the agent:

```python
GENERATION_PROMPT = """
You are generating adversarial test cases for an agent that {task_description}.

Agent system prompt:
{system_prompt}

Existing examples:
{examples}

Generate 20 new test cases. Focus on:
- Ambiguous inputs that could be interpreted multiple ways
- Inputs with missing required information
- Edge cases at the boundary of what the agent should handle
- Inputs that look valid but should be rejected
- Format variations the agent might not expect

Return as JSON: [{{"input": ..., "expected": ..., "edge_case_type": ...}}]
"""
```

The `edge_case_type` field is load-bearing. It forces the model to articulate *why* each case is interesting, and that rationale lets you catch when it's generating trivial cases by accident. If the type is "normal input with slight variation," throw it out.

## What to Watch For

The model will generate cases it can solve. Left unsupervised, a generation pass fills up with well-formed inputs that your agent handles without breaking a sweat. You want the opposite.

Two mitigations. First, prompt explicitly for cases the agent would likely *fail* on, not just cases that are *interesting*. Second, run each generated case through your agent immediately and discard anything it answers correctly with high confidence — those aren't stress cases, they're padding.

Expect the useful slice to be roughly 40–60% of what the model generates. That's still ten times faster than writing from scratch.

## Scale the Distribution, Not the Count

Don't generate 200 random cases. Generate focused batches with different priors:

- 20 cases biased toward ambiguous intent
- 20 cases with missing required information
- 20 off-topic inputs (things the agent should decline)
- 20 cases at scale limits — long inputs, large lists, deeply nested structures
- 20 cases with subtle formatting errors or encoding issues

Now you have 100 cases that map to distinct failure modes. This is more useful than 200 random examples because it tells you which *category* of input your agent can't handle. "Fails 12% of the time" is much less actionable than "fails on off-topic inputs and ambiguous date ranges specifically."

## The Generation Isn't the Eval

Generated cases still need expected outputs. For some tasks you can auto-generate these too — if the expected behavior is deterministic, derive it programmatically. For anything subjective, you need a human to verify the label before the case goes into your golden set. Treat generated cases as *candidates*, not finished evals.

One pattern that works: run the generation step, then do a fast human review pass — ten minutes to scan 20 candidates, approve or reject, fill in expected outputs where they're missing. It's faster than writing from scratch because rejection is much easier than creation.

## The Payoff

Run the generator when you first build the agent. Run it again when you change the system prompt. Run it when you add a new tool or expand the task scope. Treat it as part of the deployment pipeline, not a one-time bootstrapping step.

A well-seeded, distribution-aware eval suite is how you get from "it seems to work" to "it handles ambiguity reliably but breaks on off-topic inputs — we know exactly where to fix it." Synthetic generation is how you build that suite without a multi-week labeling project.
