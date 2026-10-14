---
title: "A PDF Page Is Billed as Text and as an Image"
date: "2026-10-14"
summary: "A document-heavy agent's token bill ran 2-3x what the extracted text should have cost, because Claude reads a PDF page twice — once for the words, once for the layout — and bills for both passes."
tags: ["agents", "cost", "multimodal"]
status: draft
author: "Bharath"
---

## The estimate that was off by a clean multiple

A contract-review agent chunked incoming PDFs, counted the extracted text with a tokenizer, and used that number to budget context and project cost per document. The budgeting was careful — real tokenizer, not chars-divided-by-four — and it was still wrong by roughly 2-3x on every single document. Not a rounding error, not an occasional outlier: a consistent multiple, page in and page out, regardless of contract type.

The team's tokenizer was counting the right thing and the wrong thing at the same time. It was counting the words. It wasn't counting the page.

## A PDF document block isn't a text document block

When you send a PDF to Claude as a `document` content block, the model doesn't just OCR it into a string and read that string. It processes each page as a rendered image — so it can reason about tables, charts, signatures, and layout that plain text extraction would flatten or lose — *and* it extracts the text from that page for grounding and citations. Both representations go into the context window. A ten-page PDF isn't "the text on ten pages" worth of tokens; it's that, plus ten image-equivalent token costs, one per page, whether or not the page has a single graphic on it.

This isn't a bug in anyone's integration — it's the documented behavior, and it's the right tradeoff for what the feature promises. A contract where a numbered list's indentation changes its meaning, or a financial report where a number's position in a table is the only thing that disambiguates it, genuinely needs the layout-aware pass. The miscalibration is entirely on the estimating side: a mental model built on "PDF equals text extraction" charges you for half the pipeline and silently drops the other half off the invoice.

## Estimate per page, not per character

Stop sizing PDF cost and context budget from the extracted text length. Size it from page count first, text length second:

```python
def estimate_pdf_tokens(num_pages: int, extracted_text: str) -> int:
    # Each page carries an image-equivalent cost independent of its text —
    # a mostly-blank page and a dense table both pay the per-page floor.
    PER_PAGE_FLOOR = 1500
    text_tokens = count_tokens(extracted_text)
    return max(text_tokens, num_pages * PER_PAGE_FLOOR) + text_tokens
```

Treat the two components as additive, not as alternatives — the page cost doesn't replace the text cost, it rides alongside it. If your pipeline chunks PDFs by target token count before sending them, chunk by page count instead, with a token ceiling as the backstop rather than the primary rule. A 40-page PDF chunked into "5,000-token pieces" based on text alone will blow past your real context budget the moment it hits a page-cost multiplier your chunker never modeled.

## Where it's worth fighting

If your documents are genuinely text-only — a legal brief with no tables, scans, or embedded images, where layout carries no information the text doesn't already carry — extracting the text yourself and sending it as a plain text block, not a PDF block, skips the image pass entirely and bills only once. You lose layout awareness for anything that needed it, so check that the trade is actually free for your document type before you take it. For scanned contracts, financial statements, and anything with a table that matters, pay for both passes on purpose instead of discovering the multiplier from a bill.
