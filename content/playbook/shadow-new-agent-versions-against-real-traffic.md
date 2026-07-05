---
title: "Shadow New Agent Versions Against Real Traffic"
date: "2026-07-02"
summary: "Evals catch the failure modes you thought to write down — shadow traffic catches the ones you didn't."
tags: ["agents", "reliability", "deployment"]
status: published
author: "Bharath"
---

## Passing the exam isn't the same as doing the job

You changed the system prompt, swapped a tool, or bumped the model ID. Your eval suite is green. You ship. Three days later someone notices the new version handles a request shape that never made it into your twenty examples, and it's been doing it wrong in production the whole time.

Evals are a sample. Production traffic is the population. No eval set, however carefully built, covers the long tail of real inputs — malformed requests, unusual phrasing, edge-case account states. The only way to see how a new agent version behaves on *that* distribution is to run it on that distribution, before it's trusted to act.

## Shadow mode: two versions, one decision-maker

Shadow mode means routing every real request to both the current agent and the candidate, but only letting the current one's output take effect. The candidate runs for real, on real inputs, with its reasoning and tool calls fully exercised — it just doesn't get to send the email or write the row.

```python
def handle_request(request):
    result = run_agent(CURRENT_VERSION, request, live=True)

    try:
        shadow_result = run_agent(CANDIDATE_VERSION, request, live=False)
        log_comparison(request, result, shadow_result)
    except Exception as e:
        log_shadow_error(request, e)  # candidate crashing is data too

    return result
```

`live=False` threads down to your tool executor the same way a dry-run flag does — the candidate's tool calls get simulated, not executed. The two runs are otherwise identical: same request, same tools, same context.

## Diff on decisions, not exact text

Don't compare full response strings — two good agents rarely say the same thing verbatim, and you'll drown in false positives. Compare the things that matter: which tools were called, with what arguments, and what the final action would have been. Log every case where the candidate would have taken a different action than the current version took, and route a sample of those to human review. That's your actual regression signal — not "did the wording change" but "did the *decision* change."

## Ramp, don't flip

Once shadow comparisons look clean over a real traffic window — a few days, not a few hours, so you catch time-of-day and weekly patterns — move the candidate to live traffic at 5%, then 25%, then 100%, watching the same decision-diff metric at each step instead of trusting the shadow results alone. Shadow mode tells you the candidate reasons correctly when nothing is at stake. A small live ramp tells you it still does when something is.

## The cost argument

Shadow mode roughly doubles your inference cost for the traffic you're comparing, plus the tool-simulation overhead you already built for dry-run mode. That's real money for a week. It's cheaper than finding out the new prompt silently broke refund logic for 2% of requests after it's been live for a month.
