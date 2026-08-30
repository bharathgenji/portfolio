---
title: "A Retry Doesn't Fix a Shared Cause"
date: "2026-08-30"
summary: "Retrying the six sub-agents that failed out of twenty only helps if their failures were independent — and a surprising number of production fan-outs aren't."
tags: ["agents", "multi-agent", "reliability"]
status: draft
author: "Bharath"
---

## The retry that kept failing the same way

A document-summarization pipeline fanned out twenty sub-agents, one per section, each pulling its chunk from a shared retrieval cache. Six came back with obviously truncated summaries. The retry logic did the right-looking thing: re-run the six failed slices, leave the fourteen good ones alone. All six failed again, with the same truncation, in the same places. A third retry, same result. The on-call engineer spent an hour looking for model flakiness before noticing all six sections had been served by the same upstream scraper instance, which had cached a partial fetch behind a five-minute TTL. Retrying the sub-agent did nothing, because the sub-agent was never the thing that was broken.

## Independence is an assumption your retry math makes, not a fact about your system

The standard fan-out argument — eight steps at 95% each compound to roughly 66%, and retrying only the failed slice recovers most of that — is the right way to think about failures that are genuinely independent draws. It's the wrong model the moment several sub-agents share a dependency: the same cache entry, the same rate-limited API key, the same buggy prompt template, the same oversized shared preamble that blows the context window identically for every section that includes it. When the cause is shared, the failures aren't twenty coin flips, they're one coin flip copied twenty times, and a retry samples the exact same broken input again.

## The tell: identical failure signatures across "independent" retries

Genuine per-call flakiness produces different failures on retry — a different token truncated, a different tool timeout, a different malformed field. A shared cause produces the *same* failure, verbatim, every time. Fingerprint failures before you retry them:

```python
def failure_signature(result: SubAgentResult) -> str:
    return hashlib.sha256(
        f"{result.error_type}:{result.input_hash}".encode()
    ).hexdigest()

def looks_systemic(failures: list[SubAgentResult]) -> bool:
    sigs = [failure_signature(f) for f in failures]
    return len(set(sigs)) < len(sigs) * 0.5
```

If more than half your failed slices collapse into a handful of signatures, you're not looking at variance — you're looking at one root cause wearing several disguises.

## What to do instead of retrying blind

When failures cluster on a signature, retrying the slice as-is just re-runs the same broken input against the same broken dependency. Two options actually help: force something to change before the retry — bypass the shared cache, rotate the API key, drop the oversized shared preamble for that slice — or stop retrying per-slice and page someone, because you have one incident, not six flaky sub-agents. Keep the per-slice retry path for the failures that don't share a signature; those are still the coin flips your fan-out math was built for.
