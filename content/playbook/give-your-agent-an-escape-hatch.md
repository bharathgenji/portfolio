---
title: "Give your agent an escape hatch"
date: "2026-05-20"
summary: "The single highest-leverage fix for hallucinating agents isn't a better prompt — it's giving the model a legitimate way to say 'I don't know.'"
tags: ["agents", "reliability", "rag"]
status: published
author: "Bharath"
---

Most "hallucinating agent" problems aren't reasoning problems. They're **incentive** problems. You've given the model a question and a pile of tools, and the one thing it *cannot* do is come back empty-handed. So it doesn't. It invents.

The fix is almost embarrassingly simple: give the agent an escape hatch.

## Make abstention a first-class action

Add an explicit tool — call it `escalate_to_human`, `insufficient_context`, whatever — whose entire job is to let the agent bail out gracefully:

```python
{
  "name": "insufficient_context",
  "description": "Call this when the retrieved context does not contain enough information to answer confidently. Prefer this over guessing.",
  "parameters": {
    "missing": {"type": "string", "description": "What information was needed but absent"}
  }
}
```

Now "I don't know" is a *successful* outcome, not a failure. In the EMMA system I built at NRG, the equivalent of this — a shielding node that routes low-confidence cases to a human — is what took pilot accuracy from "demo-good" to "production-good." The agent resolving 80% of cases correctly and *flagging* the other 20% beats an agent that confidently mangles all 100%.

## Pair it with a confidence threshold

The escape hatch only works if the agent actually reaches for it. Two things make that happen:

1. **Ground the instruction in the system prompt:** "If the tools/context don't support a confident answer, call `insufficient_context`. Guessing is worse than abstaining."
2. **Score confidence explicitly.** Have the agent attach a 0–1 confidence to its answer and route anything under your threshold to the escape hatch automatically. Don't trust vibes — trust a number you can tune.

## Why this beats prompt-tuning

You can spend a week wordsmithing "do not hallucinate" into the prompt and get marginal gains. Or you can spend an hour adding an abstention path and a confidence gate and get a step-change — because you've changed what the model is *optimizing for*, not just what you've asked it to avoid.

An agent that knows its own limits is more useful than one that's occasionally brilliant and unpredictably wrong. In production, predictability wins.
