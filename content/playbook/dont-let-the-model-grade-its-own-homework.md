---
title: "Don't Let the Model Grade Its Own Homework"
date: "2026-07-16"
summary: "An LLM judge from the same family as your actor model isn't neutral — it's rating its own writing style as correct."
tags: ["agents", "evals", "reliability"]
status: published
author: "Bharath"
---

## The eval that passes for the wrong reason

You wire up an LLM judge to score your agent's draft replies against a rubric. Pass rate: 94%. You ship. A week later a support lead reads twenty transcripts by hand and flags six as clearly wrong — confidently wrong, not borderline. You go back to the judge transcripts for those six. The judge rated all of them "meets rubric." Nothing is broken in your harness. The judge is doing exactly what it does: preferring outputs that read the way it would have written them.

This is self-preference bias, and it's not a fringe failure mode — it's the default when your judge model comes from the same family as your actor model. The judge isn't evaluating correctness against the rubric as an independent reader would; it's pattern-matching against its own generation habits. Same phrasing conventions, same hedging style, same structural tics all read as "good" to a judge that would produce them itself. A genuinely wrong answer that happens to be phrased the way the judge phrases things scores better than a correct answer phrased differently.

## Cross the model boundary on purpose

The fix costs nothing but a second API key: judge with a model from a different family than the one generating the output.

```python
def judge_reply(draft: str, rubric: str) -> dict:
    # actor: gpt-5.  judge: a different lineage entirely.
    result = llm(
        model="claude-sonnet-5",
        prompt=JUDGE_PROMPT.format(draft=draft, rubric=rubric),
    )
    return json.loads(result)
```

Cross-family judging alone doesn't eliminate bias — it changes which bias you're exposed to, and a different bias is easier to catch because it doesn't quietly agree with the thing you're trying to measure.

## Three checks that catch the rest

**Calibrate against human labels before you trust the judge at all.** Take 30 outputs a human has already scored, run them through the judge, and check agreement. If the judge disagrees with humans more than it agrees, the judge is the thing under test, not your agent.

**Blind the judge to which model produced the output.** If your harness ever passes model provenance into the judge prompt — even implicitly, via formatting differences that leak identity — strip it. The judge should only ever see the draft and the rubric.

**Re-run the calibration set every time you swap the actor model.** A judge calibrated against GPT-5 outputs may drift when you switch the actor to a different model with different phrasing conventions, even holding the judge itself constant. Self-preference bias is about family match, not a fixed property of the judge — recalibrate whenever either side of the pairing changes.

## What this doesn't replace

Cross-family judging is a bias mitigation, not a substitute for the human spot-check that caught this in the first place ([[start-with-twenty-evals]]). Keep both. The judge scales; the human calibrates the judge.
