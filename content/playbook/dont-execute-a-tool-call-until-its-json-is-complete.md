---
title: "Don't Execute a Tool Call Until Its JSON Is Complete"
date: "2026-07-19"
summary: "Streaming APIs hand you tool arguments one fragment at a time — fire the tool on a fragment and you'll edit the wrong file, charge the wrong amount, or crash on invalid JSON."
tags: ["agents", "streaming", "reliability"]
status: draft
author: "Bharath"
---

Streaming makes agents feel responsive: the user sees "calling `edit_file`..." appear token by token instead of staring at a spinner for four seconds. Most teams wire that UI straight into their tool executor, because the event stream *looks* like it's handing you a tool call as it happens. It isn't. It's handing you a tool call being typed out one character at a time, and the string `{"path": "src/inde` is not a file path — it's eleven-twelfths of one.

## Where this actually breaks

Anthropic and OpenAI both stream tool arguments as a sequence of raw string deltas, not as incremental valid JSON. You get `content_block_delta` events with a `partial_json` fragment; the object only becomes parseable once the block closes. Two failure modes show up once you're past the demo:

**Naive parsing throws or lies.** `json.loads('{"path": "src/inde')` raises. A team that catches that exception and retries against the next delta will eventually get valid JSON — but if anything upstream tries to be clever and regex out a field early ("just grab whatever's between the quotes after `path`"), it'll happily hand you a truncated value that parses as a perfectly reasonable-looking wrong answer. That's worse than a crash, because nothing tells you it happened.

**Interleaved parallel calls corrupt each other.** When the model makes two tool calls in one turn, both streams arrive on the same connection, distinguished only by a block index. Buffer by tool name instead of by index — a common shortcut when a run only ever seems to call one tool of each kind — and the day it calls `search` twice in parallel, the two argument streams get concatenated into one string that parses as neither.

## Separate the render buffer from the execution buffer

Keep two buffers per tool call, not one. The render buffer is for the UI and can display partial content freely — that's the whole point of streaming. The execution buffer only ever gets read once, at block close.

```python
buffers: dict[int, str] = {}  # index -> accumulated partial_json

def on_delta(event):
    idx = event.index
    buffers[idx] = buffers.get(idx, "") + event.delta.partial_json
    render_ui(idx, buffers[idx])          # fine to show mid-stream

def on_block_stop(event):
    idx = event.index
    raw = buffers.pop(idx)
    args = json.loads(raw)                # only parse here — never before
    validate_and_execute(event.tool_name, args)
```

Key `buffers` by block `index`, supplied by the API for exactly this reason — never by tool name, and never assume there's only one call in flight. `validate_and_execute` should still run your normal argument validation (see [Validate Tool Arguments Before You Run Them](/playbook/validate-tool-arguments-before-you-run-them)); a complete JSON object isn't automatically a *correct* one, it's just no longer a fragment.

## The rule

Streaming is a presentation concern. Execution is a correctness concern. The moment you let the executor read from the same buffer the UI renders from, you've coupled a UX nicety to a safety-critical decision, and the UX nicety wins the coupling every time — because it works fine in every manual test until the network hiccups mid-argument and someone's agent calls `delete_record(id=4` on the tail end of `id=42`.
