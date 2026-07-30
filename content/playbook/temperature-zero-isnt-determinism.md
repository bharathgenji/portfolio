---
title: "Temperature Zero Isn't Determinism"
date: "2026-07-26"
summary: "Your eval suite assumes temperature=0 means the same input always produces the same output — production inference serving doesn't honor that assumption, and neither should your test design."
tags: ["agents", "evals", "reliability"]
status: published
author: "Bharath"
---

## The assertion that fails one run in fifty

Someone writes an eval that pins `temperature=0` and asserts exact-match on the completion. It passes in CI for weeks. Then it fails once, on a PR that touched nothing related, and passes again on re-run with no code change in between. The instinct is to blame flaky infrastructure and add a retry. The instinct is wrong — the model actually returned a different string, from the identical prompt, at temperature zero.

Temperature zero means greedy decoding: always take the highest-probability token. It does not mean the probabilities themselves are computed identically every time. On a hosted API, your request lands in a batch with whatever else is in flight at that moment. Batch size and composition change which GPU kernels run and in what order, and floating-point addition isn't associative — `(a + b) + c` and `a + (b + c)` can differ in the last bits. Mixture-of-experts models add another source: which expert a token routes to can depend on the batch it's processed alongside. None of this shows up as a big difference. It shows up as a logit that's a hair's-width from a tie flipping which token wins, and greedy decoding downstream of that one flip diverges from there.

## Design evals for this, don't fight it

Stop treating temperature=0 as a determinism guarantee and start treating it as a tool for cutting variance, not eliminating it.

- **Exact-match only where the output space is genuinely discrete** — a tool name, a classification label, a JSON field with an enum type. These are stable because the answer space is small enough that near-tie flips rarely change the winning category.
- **Everything else gets a tolerance, not a string comparison.** Grade open-ended completions with a rubric-based judge (see [Start with Twenty Evals](/playbook/start-with-twenty-evals)) that scores semantic correctness, not token identity. A judge that asks "does this response satisfy the criteria" survives a paraphrase; `assert output == expected` doesn't.
- **If a single eval case keeps flapping, sample it 3-5 times and require the *majority* to pass**, not every run. A case that passes 4 of 5 samples is telling you the model is right but unstable near a decision boundary — genuinely useful signal, not noise to suppress.

## Where you actually need bit-for-bit reproducibility

Audits and incident replay are the one place "the model might have said something slightly different" isn't good enough. Don't try to fight inference-layer nondeterminism to get there — you can't, from the client side, control someone else's batching. Instead, record the actual completion at the time it happened and replay *that*, verbatim, rather than re-invoking the model. This is the same principle as [Keep the Clock and the RNG Out of Your Agent Loop](/playbook/keep-the-clock-and-the-rng-out-of-your-agent-loop): treat the model's output as part of the recorded state, not as a value you can regenerate on demand.

Temperature zero buys you *low* variance, which is genuinely useful — it's just not *zero* variance, and an eval suite built on the second claim will eventually flag a phantom regression and cost someone an afternoon chasing a bug that was never in the code.
