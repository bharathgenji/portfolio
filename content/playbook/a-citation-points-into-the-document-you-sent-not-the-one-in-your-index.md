---
title: "A Citation Points Into the Document You Sent, Not the One in Your Index"
date: "2026-09-26"
summary: "Claude's citations feature grounds claims in exact character ranges of the bytes you sent in that call — re-chunk the source anywhere else in your pipeline and the pointer still resolves, just to the wrong sentence."
tags: ["agents", "rag"]
status: draft
author: "Bharath"
---

## The citation was real. It just pointed at the wrong paragraph.

A support-answering agent used Claude's citations feature to ground every claim in the source policy doc — enable `citations: {enabled: true}` on a document content block, and the model returns not just an answer but the exact character range it drew each sentence from. No more "trust me, it's in there somewhere." The team wired the returned `start_char_index`/`end_char_index` straight into a "view source" link that jumped to that offset in the canonical document stored in their CMS.

It worked in every test. Then a policy doc got a two-sentence edit upstream — a clause added, nothing dramatic — and citations kept returning offsets that, resolved against the now-current CMS copy, landed three sentences off. Nobody's code threw an error. The API had done exactly what it promises: return an accurate offset into the document *as sent in that request*. Nothing about the feature knows, or claims to know, about a canonical version living somewhere else.

## The location is scoped to the call, not the corpus

Citation offsets — character indices for text documents, page numbers for PDFs, block indices for pre-chunked `content` documents — are computed against the exact bytes you attached to that specific message. That's the whole contract. There's no document ID, no hash, no version field tying a citation back to a stable identity in your retrieval index. If the text you send at generation time differs at all from what's stored elsewhere — a different chunk boundary, a re-paginated PDF, an edit that landed between indexing and serving — the citation is still internally correct and externally meaningless.

That's exactly the kind of drift a RAG pipeline invites by construction. You chunk a document one way to build embeddings, then at answer time you might send the model a different slice: a merged window around the top-k chunk, the full source document instead of just the chunk, or a version pulled fresher than the one you embedded. Each of those is a reasonable engineering choice on its own. Together, they mean the string Claude cites against is rarely byte-identical to the string your index thinks it retrieved from — the same mismatch that quietly corrupts ranking when [[mixed-embedding-versions-in-one-index-dont-error-they-just-rank-wrong]], except here it corrupts the pointer you show the user as proof.

## Snapshot what you send, not what you indexed

```python
def build_document_block(doc_id: str, text: str) -> dict:
    snapshot_id = store_snapshot(doc_id, text)  # content-addressed, immutable
    return {
        "type": "document",
        "source": {"type": "text", "media_type": "text/plain", "data": text},
        "citations": {"enabled": True},
        "metadata": {"snapshot_id": snapshot_id},
    }
```

Resolve every returned citation against `snapshot_id`, not against `doc_id` looked up live in your CMS. The snapshot is immutable by definition, so an offset into it stays correct forever, even after the source document changes underneath it. Your "view source" link should render the snapshot text at that offset, then let the reader navigate to the live document separately if they want current context — don't conflate "what Claude actually saw" with "what's true right now" by routing both through the same mutable lookup.

Treat the pairing of "the text Claude saw" and "the offsets Claude returned" as one atomic unit that has to be stored and retrieved together, never reconstructed from a live source after the fact. A citation is only as trustworthy as your ability to prove which exact bytes it was computed against.
