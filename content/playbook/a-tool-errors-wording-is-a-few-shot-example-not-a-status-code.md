---
title: "A Tool Error's Wording Is a Few-Shot Example, Not a Status Code"
date: "2026-11-02"
summary: "The model doesn't see your error_type enum — it sees the exact sentence you wrote, and it treats that sentence as a pattern to imitate on the retry."
tags: ["agents", "tools", "reliability"]
status: draft
author: "Bharath"
---

You structure your tool errors properly: `ok: false`, a stable `error_type`, a `message` field, maybe a `retryable` flag. The model reads the payload, decides what to do next, retries. Clean.

Except the model isn't reading `error_type` the way your code does. Your dispatcher switches on the enum string. The model reads the *whole payload as text* and treats it the same way it treats every other piece of context: as an example of what's normal in this conversation. The exact wording of `message` becomes a template it echoes, not a signal it parses.

## The echo trap

The most common version of this: you validate a bad argument and report it by repeating it back.

```python
return {
    "ok": False,
    "error_type": "invalid_date",
    "message": f"'{date_str}' is not a valid date. Expected format: YYYY-MM-DD.",
}
```

That looks informative. But if `date_str` was `"2026-13-45"`, the model now has a turn in its context where `"2026-13-45"` sits right next to the string `"valid date"`. On the retry, models frequently produce a near-miss of the broken value — `"2026-12-45"` or `"2026-13-04"` — rather than a value built fresh from the correct format. They're pattern-completing off the most recent concrete example in context, and the most recent concrete example is the mistake you just echoed.

Don't echo the bad input next to the fix. Show the fix on its own:

```python
return {
    "ok": False,
    "error_type": "invalid_date",
    "message": "Date must be YYYY-MM-DD, e.g. 2026-03-14.",
}
```

No broken value in the payload at all. The only concrete date string in context is a correct one.

## Tone leaks too

If your error messages read like apologetic stack traces — "Sorry, something went wrong while attempting to process your request, please try again" — don't be surprised when the model's eventual answer to the *user* picks up that same hedging, apologetic register. It has no other model of "how do I talk about failure in this conversation" except the one you handed it forty tool calls ago. Write error messages the way you'd write a good commit message: flat, factual, no apology, no filler.

## How to catch this in evals

Don't just assert that a bad call gets rejected — assert on what the *next* call looks like. Feed the same invalid argument through your eval suite and inspect the retry's arguments, not just whether a retry happened. If the retry is a one-character edit of the original bad value, your error message is reinforcing the mistake instead of correcting it, and no amount of `retryable: true` will fix that.

The schema-level fields are for your dispatcher. The prose is for the model. Write it with the same care you'd give a few-shot example — because that's exactly what it is.
