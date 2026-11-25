---
title: "A Character Doesn't Cost the Same Number of Tokens in Every Language"
date: "2026-11-25"
summary: "An agent tuned and load-tested on English prose will blow its context budget and clip its own output the day a non-English user shows up."
tags: ["agents", "cost", "i18n"]
status: draft
author: "Bharath"
---

## The support bot that worked perfectly until it launched in Japan

A support agent was tuned entirely against English tickets: chunk size, `max_tokens` on the reply, the context budget that decided how many past messages to keep. All of it tested fine for months. The week it opened to Japanese users, two things broke at once — replies started getting cut off mid-sentence, and long tickets started overflowing the context window well before the character count said they should. Nobody had touched the token math. The token math had never been true for Japanese; it just hadn't been tested against it.

## chars / 4 is an English number, not a universal one

Byte-pair tokenizers learn their vocabulary from training data, and that vocabulary is dominated by English and a handful of other Latin-script languages. Common English words and word-fragments get their own single tokens, which is why English prose averages something like 4 characters per token. That ratio isn't a property of language in general — it's a property of what got frequent enough during BPE training to earn a dedicated token.

CJK text didn't earn that. A single Chinese or Japanese character is frequently encoded as multiple tokens, because the tokenizer is working at something closer to the byte or sub-character level once it falls outside its well-represented vocabulary. The practical result: the same sentence, expressing the same meaning, can cost two to three times as many tokens in Japanese, Korean, or Thai as it does in English. Your chars/4 heuristic isn't off by a rounding error in those languages — it's off by a multiple, and the direction of the error is always the same: it undercounts.

## Where this bites you specifically

**Context budgeting.** A chunker or history-trimmer sized against English testing overflows the window sooner than its own estimate predicts, because the real token count was always higher than the char-based guess for anything outside English.

**Output truncation.** `max_tokens` set by watching English replies get cut will clip non-English replies more often, since the model needs more tokens to say the same thing — see [[max-tokens-is-a-ceiling-on-the-answer-not-just-the-bill]]. A reply that would've fit in 400 tokens of English can need 700+ of Japanese.

**Cost projections.** A per-ticket cost estimate built from an English pilot understates the real bill the moment your user base internationalizes, sometimes by more than double.

## Fix it with the real tokenizer, per language you actually serve

Don't extrapolate from one language's ratio. Run `count_tokens` against representative text in every language your users write in, and keep the ratios as data, not an assumption:

```python
samples = {"en": english_ticket, "ja": japanese_ticket, "ko": korean_ticket}
for lang, text in samples.items():
    n = client.messages.count_tokens(model=model, messages=[{"role": "user", "content": text}])
    print(lang, len(text), n.input_tokens, len(text) / n.input_tokens)
```

Then budget `max_tokens` and your context window per language tier, not off a single global constant — and put at least one non-English case in your eval set before you ever see this in production. "It passed every eval" doesn't mean much if every eval was written in the one language where the tokenizer is being generous.
