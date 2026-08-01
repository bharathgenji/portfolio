---
title: "Scrub Secrets From Tool Results Before They Reach the Model"
date: "2026-08-01"
summary: "A tool that shells out or reads a config file can hand your agent a live credential — and once it's in context, it's in every trace, every downstream call, and every retry."
tags: ["agents", "security", "tool-design"]
status: draft
author: "Bharath"
---

## The leak that never touched your source code

A debugging agent runs `kubectl describe pod` to diagnose a crash loop. The output includes an env var dump, because that's what `describe` returns — and one of those env vars is `DB_PASSWORD`. The agent doesn't know or care; it's a string in a tool result like any other. It gets appended to conversation history, sent back to the model provider on the next call because that's how context works, and logged verbatim by whatever tracing tool you use to debug agent runs. If the agent's next step is "summarize findings and post to the incident channel," the credential can ride along in prose, quoted as evidence, because from the model's point of view it was just relevant context.

None of your usual defenses catch this. Secret scanners run on git commits and CI diffs — this string was never committed, it was generated at runtime by a tool call. It's the same failure class as unscoped credentials or unvalidated tool output, but it targets a different surface: not what the agent can *do*, but what it's allowed to *see and repeat*.

## Redact at the tool executor, not the logging pipeline

Redacting in your observability layer is too late — by the time a log line exists, the secret already reached the model and is sitting in context for every subsequent call in the run. The fix has to sit between the tool's raw output and the message you hand back to the model.

```python
SECRET_PATTERNS = [
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]+?-----END \1 PRIVATE KEY-----"),
    re.compile(r"Bearer [A-Za-z0-9\-_.]{20,}"),
]

def redact(text: str) -> str:
    for pattern in SECRET_PATTERNS:
        text = pattern.sub(
            lambda m: f"[REDACTED:{sha256(m.group().encode()).hexdigest()[:8]}]", text
        )
    return text

def run_tool(name: str, args: dict) -> str:
    result = registry[name].run(args)
    return redact(result) if isinstance(result, str) else result
```

The hash in the placeholder isn't decoration — a stable hash means the same secret collapses to the same token everywhere it appears in a run, so a human reading the trace can tell "this exact value showed up three times" without it ever being the value.

## Pattern matching won't catch everything

Regexes catch things shaped like keys. They miss a password typed in plain English, a customer's SSN sitting in a support ticket a tool fetched, anything without a recognizable format. Pattern redaction is a backstop, not a boundary — the actual boundary belongs at the tool, on the query side: a tool that reads a customer record shouldn't select `ssn` into the result at all if the task never needed it. That's the same discipline as designing tool results for the model instead of for a human skimming a dashboard — decide what's safe to hand over before the call returns, not after.

This also doesn't replace scoping the credentials your tools hold in the first place. Minted, narrow, short-lived credentials mean a secret that slips past redaction still has a small blast radius. Redaction protects the context boundary; scoping protects the authority boundary. Neither one failing alone should be the whole incident.

## The rule

Any tool that shells out, reads a file, queries a table you don't fully control, or calls an external API can hand your agent a secret you never asked for. Strip it before the string lands in conversation history — because once it's in context, it's not a logging problem anymore, it's everywhere the model's output goes next.
