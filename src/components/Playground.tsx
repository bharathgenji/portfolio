"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { samples } from "@/lib/samples";

type Field = { key: string; value: string; confidence: number };
type Entity = { type: string; value: string };
type Result = {
  documentType: string;
  summary: string;
  entities: Entity[];
  fields: Field[];
  steps: string[];
  overallConfidence: number;
  meta?: { model: string; latencyMs: number; tokens: number | null; truncated: boolean };
};

type Status = "idle" | "running" | "done" | "error";

export default function Playground() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const revealSteps = useCallback((steps: string[]) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisibleSteps(0);
    steps.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => setVisibleSteps(i + 1), 280 * (i + 1)),
      );
    });
  }, []);

  const run = useCallback(async () => {
    const payload = text.trim();
    if (!payload || status === "running") return;
    setStatus("running");
    setError(null);
    setResult(null);
    setVisibleSteps(0);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setResult(data as Result);
      setStatus("done");
      revealSteps((data.steps as string[]) ?? []);
    } catch {
      setError("Network error — please try again.");
      setStatus("error");
    }
  }, [text, status, revealSteps]);

  const loadSample = (id: string) => {
    const s = samples.find((x) => x.id === id);
    if (s) {
      setText(s.text);
      setStatus("idle");
      setResult(null);
      setError(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Input panel ── */}
      <div className="overflow-hidden rounded-2xl border border-line bg-panel/60">
        <div className="flex items-center gap-2 border-b border-line bg-bg-elev/60 px-5 py-3">
          <span className="font-mono text-xs text-muted">input.txt</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {samples.map((s) => (
              <button
                key={s.id}
                data-testid="lab-sample"
                onClick={() => loadSample(s.id)}
                className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-muted transition-colors hover:border-lime hover:text-lime"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          data-testid="lab-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a document — an invoice, contract, email, resume… or tap a sample above."
          spellCheck={false}
          className="h-72 w-full resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-text-dim outline-none placeholder:text-faint"
        />
        <div className="flex items-center gap-3 border-t border-line px-5 py-3">
          <button
            data-testid="lab-run"
            onClick={run}
            disabled={status === "running" || !text.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-[#07080a] transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40"
          >
            {status === "running" ? (
              <>
                <span className="h-2 w-2 animate-ping rounded-full bg-[#07080a]" />
                extracting…
              </>
            ) : (
              <>❯ run extraction</>
            )}
          </button>
          <span className="ml-auto font-mono text-[11px] text-faint">
            {text.length.toLocaleString()} chars
          </span>
        </div>
      </div>

      {/* ── Output panel ── */}
      <div className="overflow-hidden rounded-2xl border border-line bg-panel/60">
        <div className="flex items-center gap-2 border-b border-line bg-bg-elev/60 px-5 py-3">
          <span className="font-mono text-xs text-muted">
            agent ▸ gemini-2.5-flash
          </span>
          {result?.meta && (
            <span className="ml-auto font-mono text-[11px] text-mint">
              {result.meta.latencyMs}ms
              {result.meta.tokens ? ` · ${result.meta.tokens} tok` : ""}
            </span>
          )}
        </div>

        <div className="h-[22.5rem] overflow-y-auto px-5 py-4">
          {status === "idle" && (
            <p className="font-mono text-sm text-faint">
              ↳ output will appear here. The agent classifies the document,
              extracts structured fields + entities, and scores its confidence.
            </p>
          )}

          {status === "error" && (
            <div data-testid="lab-error" className="rounded-xl border border-amber/30 bg-amber/5 p-4 text-sm text-amber">
              ⚠ {error}
            </div>
          )}

          {status === "running" && (
            <div className="space-y-2 font-mono text-sm text-muted">
              <div className="flex items-center gap-2 text-lime">
                <span className="h-2 w-2 animate-pulse rounded-full bg-lime" />
                analyzing document…
              </div>
            </div>
          )}

          {status === "done" && result && (
            <motion.div
              data-testid="lab-result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              {/* trace */}
              <div className="space-y-1.5 font-mono text-[12px]">
                {result.steps.slice(0, visibleSteps).map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 text-muted"
                  >
                    <span className="text-lime">✓</span> {s}
                  </motion.div>
                ))}
              </div>

              {/* header */}
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <span className="rounded-full border border-lime-deep/40 bg-lime-glow px-3 py-0.5 font-mono text-[12px] text-lime">
                  {result.documentType}
                </span>
                <span className="font-mono text-[11px] text-muted">
                  confidence{" "}
                  <span className="text-mint">
                    {Math.round((result.overallConfidence ?? 0) * 100)}%
                  </span>
                </span>
              </div>
              <p className="text-sm text-text-dim">{result.summary}</p>

              {/* fields */}
              {result.fields?.length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-lime">
                    extracted_fields
                  </div>
                  <div className="divide-y divide-line rounded-xl border border-line">
                    {result.fields.map((f, i) => (
                      <div key={i} className="flex items-baseline gap-3 px-3 py-2">
                        <span className="w-2/5 shrink-0 font-mono text-[12px] text-mint">
                          {f.key}
                        </span>
                        <span className="flex-1 text-[13px] text-text">{f.value}</span>
                        <span className="font-mono text-[10px] text-faint">
                          {Math.round((f.confidence ?? 0) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* entities */}
              {result.entities?.length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-lime">
                    entities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.entities.map((e, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-line bg-bg-elev px-2 py-0.5 font-mono text-[11px] text-text-dim"
                      >
                        <span className="text-faint">{e.type}:</span> {e.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
