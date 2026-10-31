---
title: "Defer the Schema, Not the Tool"
date: "2026-10-31"
summary: "Listing every tool's name costs a handful of tokens; listing every tool's full input schema costs hundreds — collapse that gap by loading schemas only for the tools about to be called."
tags: ["agents", "tools", "context"]
status: draft
author: "Bharath"
---

## The hundred-tool problem has a cheaper fix than retrieval

[[stop-passing-every-tool-to-every-call]] solves the token tax of a huge tool catalog by retrieving the top-k relevant tools per turn instead of shipping all of them. That works, but it still ships a *full* schema — name, description, every parameter, every enum — for each of the k it picks. Once your catalog spans a few hundred tools across a dozen MCP servers, even k=8 full schemas can run a few thousand tokens, and you're paying that on every single turn, including the turns where the model never calls any of them.

The cheaper move is a second axis of laziness: separate *knowing a tool exists* from *knowing how to call it*. Expose every tool's name and a one-line description upfront — that's ten or fifteen tokens each, so a thousand-tool catalog still fits in a page. Give the model one dedicated tool, a schema-fetcher, that returns the full input schema for a specific name on request. The model only pays the full schema cost for the handful of tools it actually decides to use in a given run.

## The failure mode: calling blind

The one-line description is enough for the model to guess it wants `send_invoice`, and some models will skip the fetch step entirely and emit a call with arguments it invented from the name alone. Your dispatcher has to catch this explicitly, not let it fail as a generic bad-request:

```python
def dispatch(tool_name: str, args: dict) -> dict:
    if tool_name not in loaded_schemas:
        return {
            "error": f"Schema for '{tool_name}' isn't loaded. "
                     f"Call fetch_schema('{tool_name}') first, then retry the call."
        }
    validate(args, loaded_schemas[tool_name])
    return execute(tool_name, args)
```

Phrase the error as an instruction, not a complaint — the model is one tool call away from fixing it itself, and a clear redirect costs you nothing while a bare `KeyError` costs a dead turn.

## It trades context for a round trip

The fetch step is a real model turn: see name, call fetch, read schema, then call the tool. For a tool used once per run, that's double the latency it would've had with the schema inlined from the start. This only pays off because the fetch happens once per tool per session — cache the fetched schema in your dispatcher's working state so the second call to the same tool in the same run skips straight to execution. If your agent calls the same five tools every run, deferred loading is pure overhead; it earns its cost on the long tail of tools a given run never touches at all.

## Watch where the fetched schema lands

Once fetched, append the schema downstream of your cache boundary rather than re-sorting it into the original tool list — [[your-tool-list-is-part-of-the-cache-prefix]] already covers why reshuffling what precedes the cache marker turns one fetch into a full prefix miss.

## The rule

Below a few dozen tools, don't bother — inline schemas and move on. Past a few hundred, spread across servers you don't fully control, the name-only catalog is what makes the thing navigable at all. Let the model ask before it commits to a schema it hasn't earned the context budget for yet.
