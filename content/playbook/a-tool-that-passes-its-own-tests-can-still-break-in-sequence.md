---
title: "A Tool That Passes Its Own Tests Can Still Break in Sequence"
date: "2026-10-01"
summary: "Every tool in the support bot had clean unit tests and a 100% pass rate — the bug only existed in the specific three-call order the agent actually used."
tags: ["agents", "testing", "reliability"]
status: draft
author: "Bharath"
---

## The note that landed on the wrong ticket

A support agent had three tools: `open_ticket(customer_id)` returns a `ticket_id`, `add_note(ticket_id, text)` appends to it, and `close_ticket(ticket_id)` closes it. Each had unit tests, each passed — call `open_ticket` with a valid customer, get back a well-formed ID; call `add_note` with a valid ticket, get back a confirmed append. The team shipped it confident the tool layer was solid, because by the usual measure, it was.

In production, the model occasionally batched `open_ticket` and `add_note` into the same turn, as two tool calls in one assistant message, because nothing in either tool's schema told it they had to be sequential. It didn't have the real ticket ID yet when it wrote the `add_note` call — so it guessed the ID format and filled in a plausible-looking placeholder. `add_note` validated that the string matched the ID pattern, found a plausible match against an old ticket from earlier in the conversation, and appended the note there instead. No exception. No validation failure. Just a note on the wrong ticket, and a passing test suite that never once called these two tools in that order.

## Isolated tests check shape, not sequence

[[test-your-tools-in-isolation]] is still the right baseline — you do want to know a tool handles its own edge cases without a model in the loop. But isolated tests, by construction, exercise each tool with inputs *you* chose. They can't catch a bug that only exists in the gap between two tools: an assumption one makes about state the other was supposed to establish first. That gap is invisible until something calls them in the actual order and combination the agent produces, which is frequently not the order you designed for.

## Replay real trajectories, not hand-picked call sequences

The fix isn't more unit tests. It's a second test layer that replays actual tool-call sequences pulled from eval transcripts or production logs, against the real tool implementations:

```python
def test_known_trajectory(trajectory_fixture):
    state = {}
    for call in trajectory_fixture.calls:
        result = dispatch(call.tool, call.args, state)
        assert result.get("error") is None, (
            f"{call.tool} failed given prior sequence: "
            f"{[c.tool for c in trajectory_fixture.calls[:trajectory_fixture.calls.index(call)]]}"
        )
```

Seed this with every distinct call order you've actually seen the model produce, not just the one you assumed was canonical. Add a new fixture every time production surfaces a sequence you didn't anticipate — the set grows the same way a regression suite grows, one real incident at a time.

## Guard ordering in code, not in the prompt

Where a tool genuinely depends on another running first, enforce it structurally instead of hoping the model respects an instruction: have `add_note` reject any `ticket_id` it didn't itself issue or isn't present in a session-scoped set of open tickets, rather than pattern-matching the string and accepting whatever looks close enough. A loud, typed rejection the model can recover from beats a quiet write to the wrong record every time.

## The tell

If a bug never reproduces when you call the suspect tool directly, but shows up intermittently in full runs, stop looking at the tool. Look at what called it immediately before — and in what order.
