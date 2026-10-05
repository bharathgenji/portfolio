---
title: "A Tool Result Safe for the Model Isn't Safe for the User"
date: "2026-10-05"
summary: "You redacted secrets from tool results before they reach the model — but the stack trace, internal hostname, and SQL fragment you left in are heading straight into the chat window."
tags: ["agents", "security", "ux"]
status: draft
author: "Bharath"
---

## The ticket that quoted the database

A support agent called an internal order-lookup tool. The tool failed — connection pool exhausted — and returned the kind of error a backend engineer would want: `psycopg2.OperationalError: FATAL: too many connections for role "orders_ro" at host orders-replica-3.internal.prod:5432`. That's a good error to hand the model. It's specific, it's machine-parseable, and per [Return Errors to Your Agent, Don't Throw Them](/playbook/return-errors-to-your-agent-dont-throw-them), returning it as content instead of throwing is exactly right — the model can decide to retry, wait, or fall back.

The model retried, failed again, and told the customer: "I'm sorry, I'm unable to look up your order right now. The error was: `FATAL: too many connections for role "orders_ro" at host orders-replica-3.internal.prod:5432`. Please try again later." That sentence shipped a database role name, an internal hostname, and a port straight into a support chat transcript — a transcript that gets logged, screenshotted, and forwarded.

## Two different audiences, one string

[Scrub Secrets From Tool Results Before They Reach the Model](/playbook/scrub-secrets-from-tool-results-before-they-reach-the-model) covers redacting credentials before the model ever sees them — the model-facing boundary. This is a different boundary, one step later: content that's perfectly fine for the model to reason over is not automatically fine for the model to *repeat*. A stack trace, an internal hostname, a raw SQL fragment, a vendor error code tied to your specific plan tier — all useful diagnostic signal for the agent's own decision-making, none of it meant for the person on the other end of the conversation.

The model doesn't draw this line on its own. From its point of view, the tool result is just the most relevant, most specific text available when it composes an answer, and specific text is exactly what a model is trained to prefer over vague paraphrase. Without an explicit instruction, "be helpful and precise" and "quote your internal error verbatim" look like the same behavior.

## Separate the two channels explicitly

Don't rely on prompt-level politeness ("please don't share internal details") as your only control — treat it as a formatting problem with a structural fix, the same way you'd scope tools instead of trusting the model to self-restrict:

```python
def format_tool_error(error: dict) -> dict:
    return {
        "ok": False,
        "error_type": error["error_type"],      # model-facing: reasoning signal
        "internal_detail": error["raw_message"], # model-facing: debugging signal
        "user_message": USER_SAFE_MESSAGES.get(
            error["error_type"],
            "Something went wrong on our end. We're looking into it.",
        ),
    }
```

Then make the system prompt explicit about which field is which: *"`internal_detail` is for your own diagnosis only. Never include it, or any identifiers, hostnames, or code from it, in a response shown to the user. If you need to tell the user something went wrong, use `user_message` or write your own plain-language summary."* That's a concrete, checkable instruction, not a vibe — and because it names the field, you can grep transcripts for violations instead of guessing whether the model is behaving.

## Check the boundary where the response actually leaves

Add a cheap regex pass on the final assistant message before it renders to the user — internal hostnames, stack trace patterns, `.internal`/`.prod` suffixes, anything matching your own infra naming convention — and log or block a match rather than trusting the prompt alone. This is the same posture as validating tool call arguments before execution: the prompt is your first line, not your only one, because the one time the model paraphrases badly under pressure is the one time nobody's reading the transcript until a customer forwards it.

## The rule

"Safe for the model to see" and "safe for the model to say" are different questions, answered by different mechanisms — the first is a redaction problem at the tool boundary, the second is a formatting and output-filtering problem at the response boundary. Solve one and assume you've solved both, and the detail you decided was fine for debugging ends up as the detail your customer pastes into a support forum.
