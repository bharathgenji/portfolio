---
title: "Freeze Tool Responses for Fast, Deterministic Evals"
date: "2026-06-19"
summary: "If your evals hit real APIs every run, you'll stop running them — fixture-based replay is what makes an eval suite something you actually use."
tags: ["agents", "evals", "reliability"]
status: published
author: "Bharath"
---

The eval suite from "Start with Twenty Evals" is only as useful as your ability to actually run it. If every eval invokes real tools — web searches, database queries, third-party APIs — each run takes minutes, costs real money, and fails whenever an upstream service hiccups. The practical result: nobody runs the evals. They rot. They become a document that says "evals coming soon."

The fix is fixture-based replay: record real tool responses on the first run, freeze them to disk, replay them on every subsequent run. Same idea as HTTP cassette libraries (VCR, betamax, pytest-recording), applied to your agent's tool layer.

## The pattern

Wrap each tool call with an interceptor that checks a fixture store before touching the real implementation. On first run with `record=True`, call through and save the result. Every run after that, short-circuit to the saved response.

```python
class ToolFixtures:
    def __init__(self, path: Path, record: bool = False):
        self.path = path
        self.record = record
        self.store = json.loads(path.read_text()) if path.exists() else {}

    def wrap(self, fn):
        async def interceptor(**kwargs):
            key = f"{fn.__name__}:{json.dumps(kwargs, sort_keys=True)}"
            if key in self.store:
                return self.store[key]
            if not self.record:
                raise MissingFixture(key)
            result = await fn(**kwargs)
            self.store[key] = result
            self.path.write_text(json.dumps(self.store, indent=2))
            return result
        return interceptor
```

Commit the fixture files. Evals that used to take four minutes now run in eight seconds. No API keys needed in CI. Results are deterministic across machines and months.

## Where to intercept

Don't mock at the tool function boundary. Mock at the transport layer: the HTTP client inside your search tool, the database cursor, the subprocess shell call. This keeps your actual tool code — the parsing, the error handling, the result formatting — executing against recorded data. If you stub `search_web(query)` directly, you're only testing the model's use of a fake. If you intercept the underlying HTTP call, your real tool logic still runs and can still break.

## Refreshing fixtures

Add a `--record` flag to your eval runner. When upstream behavior changes — a new API response shape, a schema migration — run once in record mode, review the fixture diff, and commit. That diff is your changelog for what changed in the world your agent lives in. It's worth reviewing before you hand-wave it through.

## The non-deterministic args gotcha

If your tool is called with a timestamp, UUID, or session token embedded in the args, your fixture key will never match a saved record. Normalize before hashing: strip timestamps, sort list fields, drop identifiers that vary per run. The key should capture the semantic intent of the call, not its incidental state.

An eval suite that takes four minutes to run gets skipped on every PR. One that runs in eight seconds becomes a gate. Fixture-based replay is the difference between the two.
