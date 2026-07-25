---
title: "Stateful Tools Need Sticky Sessions"
date: "2026-07-25"
summary: "A browser or shell tool that lives in worker memory works perfectly in dev and breaks the moment you run two workers — because the model calls it like a function, but it isn't one."
tags: ["agents", "tool-design", "infrastructure"]
status: draft
author: "Bharath"
---

## It worked on one box

A tool wraps a headless browser: `open_page`, `click`, `read_text`. In dev it's one process, so the `Browser` object the tool creates on `open_page` is still sitting in memory when `click` runs a second later. Ship it behind two workers and a load balancer, and the second call has a coin-flip chance of landing on a worker that never saw `open_page` at all. Either the tool throws `no active session`, or — worse — the tool code has a fallback that quietly opens a fresh browser on `about:blank` and returns whatever `read_text` finds there. The agent gets a plausible-looking empty result, decides the page has no content, and moves on. Nothing crashed. The run is just wrong.

The same failure shows up for any tool with server-side state scoped to a session: a REPL that holds variables between calls, a database tool that keeps a transaction open across `begin`/`query`/`commit`, an auth flow that stashes a token in a local dict keyed by request. Locally, "state lives in this process" and "state lives for this session" are the same statement. The instant you run more than one worker, they aren't, and nothing in the tool's function signature tells you that — from the model's side, `click(selector)` looks exactly as stateless as `get_weather(city)`.

## Route by session, not round robin

If the state has to live in worker memory, pin every call for a given session to the same worker instead of load-balancing them independently:

```python
def worker_for(session_id: str, workers: list[str]) -> str:
    idx = int(hashlib.sha256(session_id.encode()).hexdigest(), 16) % len(workers)
    return workers[idx]
```

This is consistent hashing, the same trick sticky load balancers have used for web sessions for twenty years — it's just that "tool call" doesn't usually get treated as a request that needs the same guarantee. `session_id` has to be the agent's run ID or an explicit session handle the tool returned from `open_page`, threaded through every subsequent call the same way you'd thread a trace ID.

## Better: don't pin, externalize

Sticky routing has a failure mode of its own: the worker holding session state dies or gets rescheduled, and the session is gone with no warning. Where the underlying system supports it, persist session state somewhere any worker can rehydrate from — a browser context saved to disk, a shell's environment serialized to a blob store, a transaction ID a fresh connection can resume — keyed by session ID, not worker identity. This costs more up front than a hash function but survives autoscaling and restarts, which sticky routing by itself doesn't.

## Never let "session not found" become "new session, silently"

Whichever approach you pick, the tool's response to a missing session has to be a loud, typed error — `session_expired`, not an empty success. An agent that gets `session_expired` can restart the flow deliberately. An agent that gets a quiet fresh session has no signal that anything went wrong, and neither will the person reading the transcript afterward.

Any tool that keeps state per session needs an explicit answer to "which worker has this" the day it runs on more than one instance. Skip the question and you won't get an outage — you'll get transcripts that look fine and results that are quietly wrong.
