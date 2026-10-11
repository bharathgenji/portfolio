---
title: "A Single-Turn Eval Never Meets the User Who Changes Their Mind"
date: "2026-10-11"
summary: "Your eval suite scores the model's answer to a question — it never checks whether the agent still remembers the answer it gave three turns ago."
tags: ["agents", "evals", "reliability"]
status: draft
author: "Bharath"
---

## The bug that only showed up in production

A booking agent passed every eval in the suite — correct tool calls, correct dates, correct confirmation copy. In production it kept asking customers for their departure city after they'd already given it, sometimes twice in the same conversation. No eval caught this because every eval was a single turn: one user message, one expected tool call, graded in isolation. The agent was locally correct at every step and globally incoherent across the conversation. Nothing in the test suite could have seen that, because nothing in the test suite had a second turn that depended on the first.

## Single-turn accuracy and multi-turn coherence are different metrics

A single-turn eval answers "given this exact context, does the model do the right thing." That's necessary, but it silently assumes the context handed to the model was itself correct — fully summarized, nothing dropped, no contradiction introduced by an earlier tool result. In production, the agent builds its own context turn over turn, and that's exactly where state gets lost: a compaction step drops the user's constraint, a tool result overwrites an earlier one, the agent re-derives an answer that conflicts with what it already told the user. None of that is visible to an eval that starts fresh every time.

## Build a simulated user, not another transcript

Freezing real transcripts and replaying them (see: don't draw few-shot examples from your eval pool) tells you if the agent still produces the same output given the same history. It doesn't tell you if the agent can *build* a correct history. For that you need a second model playing an adversarial user across N turns, scored on trajectory properties rather than per-turn correctness:

```python
def simulate_conversation(agent, user_sim, max_turns=8):
    transcript = []
    for _ in range(max_turns):
        user_msg = user_sim.respond(transcript)
        agent_msg = agent.respond(transcript + [user_msg])
        transcript += [user_msg, agent_msg]
        if user_sim.satisfied(transcript):
            break
    return transcript

# score for: repeated questions, contradicted commitments,
# constraints from turn 1 still honored at turn 7
```

Script the simulated user to do the things real users do: give information early then test whether it's still honored five turns later, correct themselves mid-conversation, go quiet on a detail so the agent has to ask instead of guessing. Grade the resulting transcript for trajectory-level failures — did it re-ask for known information, did it contradict an earlier commitment, did a constraint from turn one survive to turn seven — not just whether turn eight's tool call was technically valid.

## Where this earns its cost

Simulated multi-turn evals are expensive to run and annoying to debug compared to single-turn graders, so don't replace your single-turn suite with this — stack it on top. Reach for it specifically where state persistence is the product: booking flows, support threads, anything with a multi-step form the user fills in across messages. If your agent's only job is one-shot classification or extraction, you don't need a simulated user. If its job is to remember what someone told it, a transcript that never grows past one turn will never catch the bug that reaches your customers.
