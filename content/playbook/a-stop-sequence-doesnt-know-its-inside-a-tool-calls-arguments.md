---
title: "A Stop Sequence Doesn't Know It's Inside a Tool Call's Arguments"
date: "2026-10-22"
summary: "A stop sequence picked to trim chatty preamble text will fire just as happily in the middle of a tool call's JSON, and the truncated argument doesn't always error loudly enough to notice."
tags: ["agents", "tool-design", "reliability"]
status: draft
author: "Bharath"
---

## The email that stopped mid-sentence

A support agent drafts replies with a `send_email(to, subject, body)` tool. Early testing showed the model liked to pad its responses with a throwaway line before calling the tool — "Sure, I'll draft that now." — so someone added `stop_sequences=["\n\n"]` to cut generation short right after the preamble and get straight to the tool call. It worked in every test case, because every test case had a short, one-paragraph email body.

Three weeks later a customer gets an email that stops after the first paragraph, mid-sentence, with no closing, no signature. Nothing errored. No retry fired. The agent logged a successful tool call with a `200` from the email provider. The body argument was just short — because the real reply had two paragraphs separated by a blank line, and the model's token stream hit `\n\n` while it was still emitting the `body` field's JSON string, not after the preamble. The API stopped generation right there, `stop_reason` came back as `stop_sequence`, and the partial JSON parser — written to be lenient about trailing content — closed the string and object at whatever point it was cut and happily returned a `body` field containing half an email.

## Stop sequences match text, not structure

A stop sequence is a raw substring match over the token stream. It has no idea whether the model is currently writing conversational filler, a tool name, or three levels deep inside a JSON string value. You picked `\n\n` because it reliably shows up after a short preamble — but a blank line is also just how people write multi-paragraph emails, multi-statement SQL, or any tool argument with real prose in it. The moment your tool arguments get long enough to contain the pattern you're using to detect "done talking," the same mechanism that was helping you now truncates the thing it wasn't supposed to touch.

This is why it survives code review and a full test pass: your fixtures are short because you wrote them, and short text doesn't contain blank lines. Production text is written by customers and models filling in real content, and it does.

## Treat `stop_reason: "stop_sequence"` as a signal to check, not a success

Don't trust that a stop sequence only ever fires where you intended. After generation, check whether it fired while a tool call was still open:

```python
response = client.messages.create(..., stop_sequences=["\n\n"])

if response.stop_reason == "stop_sequence":
    for block in response.content:
        if block.type == "tool_use" and not is_complete_json(block.input):
            raise TruncatedToolCallError(block.name)
```

If `is_complete_json` isn't easy to check against the raw partial JSON in your SDK, the simpler fix is to not mix the two mechanisms at all: scope stop sequences to turns where you know no tool will be called, or drop the preamble-trimming stop sequence entirely and trim the chatty prefix in your own post-processing instead. Stop sequences are a blunt instrument built for ending a turn you fully control the shape of — a free-text tool argument is exactly the content you don't control the shape of, and the two don't mix safely in the same completion.
