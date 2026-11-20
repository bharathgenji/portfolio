---
title: "A Browser Profile Doesn't Reset Itself Between Agent Sessions"
date: "2026-11-20"
summary: "Pooling browser contexts for speed is a reasonable instinct — until the next task inherits the last task's cookies, autofill, and logged-in session."
tags: ["agents", "browser-automation", "security"]
status: draft
author: "Bharath"
---

A checkout agent handles one task per request: log in, add an item, pay, confirm. Cold-starting a browser context per task was costing two to three seconds of pure launch overhead, so someone pooled them — five persistent browser profiles, round-robined across incoming tasks, each one kept warm instead of relaunched. Latency dropped. Then a support ticket came in: a customer's order shipped to a different customer's saved address, paid with a card that wasn't theirs.

Task A had logged into customer one's account on profile 3 and completed a purchase. Task B, seconds later, drew profile 3 from the pool for customer two. The page it opened was still authenticated — cookies, local storage, and the site's own session token were all still sitting in that profile from the prior task. The agent never called a `login` tool for customer two, because from the page's perspective nobody needed to. Autofill offered customer one's saved address. The agent, doing exactly what it was told — complete the purchase — filled in what the browser handed it and confirmed. No tool errored. No credential was leaked to the model's context. The data never touched a prompt at all; it lived entirely in browser state the agent's instructions never mentioned and its traces never showed.

## The profile is a session store, not a compute resource

A browser context isn't a stateless worker you can round-robin like a thread pool. It's cookies, local storage, IndexedDB, service worker caches, and autofill data — the same category of per-session state as a database connection holding an open transaction, except nothing about the tool's interface says so. `click(selector)` and `fill(field, value)` look identical whether the page underneath is logged in as nobody or as the previous customer. The pooling code that reused profile 3 was optimizing exactly the thing it should have been partitioning.

```python
# wrong: pool reused across unrelated logical sessions
profile = pool.acquire()        # may carry another customer's cookies
page = profile.new_page()
run_task(page, task)
pool.release(profile)           # returned dirty, handed to the next caller as-is
```

## Reset the profile, or don't reuse it at all

If you need the latency win, keep a pool — but of clean templates, not live sessions. Launch each task against a disposable context cloned from a cookie-free base profile, and tear it down completely when the task ends:

```python
def run_isolated(task):
    context = browser.new_context(storage_state=CLEAN_TEMPLATE)
    try:
        run_task(context.new_page(), task)
    finally:
        context.close()  # cookies, storage, autofill all discarded here
```

`storage_state=CLEAN_TEMPLATE` warms whatever's safe to share — the app's base cookies, a logged-out landing page already rendered — never a specific user's auth. The cost you're paying for is the browser process starting up, not the login flow; you can cache the former without ever caching the latter.

Treat every stateful browser context the way you'd treat a shared cache key: ask whether two different sessions landing on it could legitimately deserve two different outcomes. If yes, the session identity belongs in how the context is scoped, not in a cleanup step you're hoping runs before the next task picks it up.
