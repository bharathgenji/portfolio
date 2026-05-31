"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  type TutorState,
  type Module,
  type Card,
  slugify,
  loadState,
  saveState,
  newState,
  listStates,
  toModules,
  reviewCard,
  dueCards,
  callTutor,
} from "@/lib/tutorClient";

type Phase = "intro" | "diagnose" | "goal" | "dashboard" | "lesson" | "review";

const TARGETS = [
  { key: "curious", label: "Curious", sub: "the gist & big ideas" },
  { key: "conversant", label: "Conversant", sub: "hold a smart conversation" },
  { key: "practitioner", label: "Practitioner", sub: "actually do / build with it" },
  { key: "expert", label: "Expert", sub: "deep, can teach it" },
];

const RATINGS = [
  { q: 1, label: "Again", cls: "border-red/40 text-red hover:bg-red/10" },
  { q: 3, label: "Hard", cls: "border-amber/40 text-amber hover:bg-amber/10" },
  { q: 4, label: "Good", cls: "border-mint/40 text-mint hover:bg-mint/10" },
  { q: 5, label: "Easy", cls: "border-lime-deep/50 text-lime hover:bg-lime/10" },
];

export default function TutorApp() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [topicInput, setTopicInput] = useState("");
  const [state, setState] = useState<TutorState | null>(null);
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lesson, setLesson] = useState("");
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [queue, setQueue] = useState<Card[]>([]);
  const [qi, setQi] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resumable, setResumable] = useState<TutorState[]>([]);

  useEffect(() => {
    // defer so it's not a synchronous setState in the effect body
    const t = setTimeout(() => setResumable(listStates()), 0);
    return () => clearTimeout(t);
  }, []);

  const due = useMemo(() => (state ? dueCards(state.flashcards) : []), [state]);
  const nextModule = useMemo(
    () => state?.curriculum.find((m) => m.status === "todo") || null,
    [state],
  );

  function persist(next: TutorState) {
    setState(next);
    saveState(next);
  }

  async function run(msg: string, fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    setBusy(msg);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function begin() {
    const t = topicInput.trim();
    if (!t) return;
    const existing = loadState(slugify(t));
    if (existing && existing.curriculum.length) {
      setState(existing);
      setPhase("dashboard");
      return;
    }
    run("Thinking up the right diagnostic questions…", async () => {
      const { questions: qs } = await callTutor("diagnose", { topic: t });
      setQuestions(qs || []);
      setAnswers({});
      setState(existing || newState(t));
      setPhase("diagnose");
    });
  }

  function resume(s: TutorState) {
    setState(s);
    setPhase("dashboard");
  }

  function submitDiagnostic() {
    if (!state) return;
    const qa = questions.map((q) => ({ question: q.question, answer: answers[q.id] || "" }));
    run("Assessing what you know…", async () => {
      const assessment = await callTutor("assess", { topic: state.topic, qa });
      persist({ ...state, assessment });
      setPhase("goal");
    });
  }

  function chooseGoal(target: string) {
    if (!state) return;
    run("Designing your personalized curriculum…", async () => {
      const { modules } = await callTutor("plan", {
        topic: state.topic,
        assessment: state.assessment,
        target,
      });
      persist({ ...state, targetLevel: target, curriculum: toModules(modules || []) });
      setPhase("dashboard");
    });
  }

  function learnNext() {
    if (!state || !nextModule) return;
    run("Preparing your lesson…", async () => {
      const { text } = await callTutor("teach", {
        topic: state.topic,
        module: nextModule,
        level: state.assessment?.level,
      });
      setActiveModule(nextModule);
      setLesson(text);
      setPhase("lesson");
    });
  }

  function finishLesson() {
    if (!state || !activeModule) return;
    run("Making flashcards to lock it in…", async () => {
      const { cards } = await callTutor("flashcards", {
        topic: state.topic,
        module: activeModule,
        level: state.assessment?.level,
      });
      const created: Card[] = (cards || []).map(
        (c: { front: string; back: string }, i: number) => ({
          id: `${activeModule.id}-${i}-${Date.now()}`,
          moduleId: activeModule.id,
          front: c.front,
          back: c.back,
          ease: 2.5,
          intervalDays: 0,
          reps: 0,
          dueAt: null,
        }),
      );
      const curriculum = state.curriculum.map((m) =>
        m.id === activeModule.id ? { ...m, status: "learning" as const } : m,
      );
      persist({ ...state, curriculum, flashcards: [...state.flashcards, ...created] });
      setActiveModule(null);
      setLesson("");
      setPhase("dashboard");
    });
  }

  function startReview() {
    if (!state) return;
    const d = dueCards(state.flashcards);
    if (!d.length) return;
    setQueue(d);
    setQi(0);
    setRevealed(false);
    setPhase("review");
  }

  function rate(q: number) {
    if (!state) return;
    const card = queue[qi];
    const updated = reviewCard(card, q);
    const flashcards = state.flashcards.map((c) => (c.id === card.id ? updated : c));
    persist({ ...state, flashcards });
    if (qi + 1 < queue.length) {
      setQi(qi + 1);
      setRevealed(false);
    } else {
      setPhase("dashboard");
    }
  }

  function reset() {
    setState(null);
    setTopicInput("");
    setPhase("intro");
    setResumable(listStates());
  }

  // ── shared chrome ───────────────────────────────────────────────────────────
  const Busy = loading ? (
    <div className="mt-6 flex items-center gap-3 font-mono text-sm text-lime">
      <span className="h-2 w-2 animate-ping rounded-full bg-lime" /> {busy}
    </div>
  ) : null;

  const Err = error ? (
    <div className="mt-4 rounded-xl border border-amber/30 bg-amber/5 p-3 text-sm text-amber">
      ⚠ {error}
    </div>
  ) : null;

  return (
    <div className="rounded-2xl border border-line bg-panel/60 p-6 sm:p-8">
      {/* header */}
      <div className="mb-6 flex items-center gap-3 border-b border-line pb-4 font-mono text-xs">
        <span className="text-lime">❯</span>
        <span className="text-text">learn-agent</span>
        {state && <span className="text-faint">/ {state.topic}</span>}
        {state && (
          <button onClick={reset} className="ml-auto text-muted hover:text-lime">
            ↺ new topic
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── intro ── */}
          {phase === "intro" && (
            <div>
              <h2 className="font-display text-3xl text-text sm:text-4xl">
                What do you want to <span className="italic text-lime">learn</span>?
              </h2>
              <p className="mt-2 text-sm text-muted">
                Anything — a concept, a tool, a field. The tutor will figure out what you
                already know and build a path from there.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && begin()}
                  placeholder="e.g. transformers, options trading, Rust ownership…"
                  className="flex-1 rounded-lg border border-line bg-bg-elev px-4 py-3 font-mono text-sm text-text outline-none placeholder:text-faint focus:border-lime"
                />
                <button
                  onClick={begin}
                  disabled={loading || !topicInput.trim()}
                  className="rounded-lg bg-lime px-5 py-3 text-sm font-semibold text-[#07080a] transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40"
                >
                  begin →
                </button>
              </div>
              {resumable.length > 0 && (
                <div className="mt-6">
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                    resume
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resumable.map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => resume(s)}
                        className="rounded-full border border-line bg-bg-elev px-3 py-1 font-mono text-xs text-text-dim hover:border-lime hover:text-lime"
                      >
                        {s.topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {Busy}
              {Err}
            </div>
          )}

          {/* ── diagnose ── */}
          {phase === "diagnose" && (
            <div>
              <div className="kicker mb-2">diagnostic</div>
              <h2 className="font-display text-2xl text-text">
                A few questions to see where you&apos;re starting
              </h2>
              <p className="mt-1 text-sm text-muted">
                Answer in your own words. &ldquo;I don&apos;t know&rdquo; is a fine answer.
              </p>
              <div className="mt-5 space-y-4">
                {questions.map((q, i) => (
                  <div key={q.id}>
                    <label className="text-sm text-text-dim">
                      <span className="mr-2 font-mono text-faint">{String(i + 1).padStart(2, "0")}</span>
                      {q.question}
                    </label>
                    <textarea
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      rows={2}
                      className="mt-1.5 w-full resize-none rounded-lg border border-line bg-bg-elev px-3 py-2 font-mono text-[13px] text-text outline-none focus:border-lime"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={submitDiagnostic}
                disabled={loading}
                className="mt-5 rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] enabled:hover:-translate-y-0.5 disabled:opacity-40"
              >
                assess me →
              </button>
              {Busy}
              {Err}
            </div>
          )}

          {/* ── goal ── */}
          {phase === "goal" && state?.assessment && (
            <div>
              <div className="kicker mb-2">where you stand</div>
              <p className="text-sm">
                <span className="text-mint">{state.assessment.level}</span>{" "}
                <span className="text-text-dim">— {state.assessment.summary}</span>
              </p>
              {state.assessment.gaps?.length > 0 && (
                <div className="mt-3 text-sm">
                  <span className="text-amber">gaps to close:</span>
                  <ul className="mt-1 space-y-1">
                    {state.assessment.gaps.map((g) => (
                      <li key={g} className="flex gap-2 text-text-dim">
                        <span className="text-amber">△</span> {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="kicker mb-3 mt-6">your goal</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {TARGETS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => chooseGoal(t.key)}
                    disabled={loading}
                    className="rounded-xl border border-line bg-bg-elev p-4 text-left transition-colors hover:border-lime disabled:opacity-50"
                  >
                    <div className="font-display text-lg text-text">{t.label}</div>
                    <div className="text-xs text-muted">{t.sub}</div>
                  </button>
                ))}
              </div>
              {Busy}
              {Err}
            </div>
          )}

          {/* ── dashboard ── */}
          {phase === "dashboard" && state && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="kicker">curriculum → {state.targetLevel}</div>
                <div className="font-mono text-xs text-muted">
                  {state.curriculum.filter((m) => m.status !== "todo").length}/
                  {state.curriculum.length} started · {due.length} cards due
                </div>
              </div>

              <div className="space-y-2">
                {state.curriculum.map((m, i) => {
                  const icon =
                    m.status === "mastered" || m.status === "known"
                      ? "●"
                      : m.status === "learning"
                        ? "◐"
                        : "○";
                  const col =
                    m.status === "learning"
                      ? "text-amber"
                      : m.status === "todo"
                        ? "text-faint"
                        : "text-lime";
                  return (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 rounded-lg border border-line bg-bg-elev/50 px-3 py-2.5"
                    >
                      <span className={`mt-0.5 font-mono ${col}`}>{icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-text">
                          {m.title}{" "}
                          <span className="font-mono text-[10px] text-faint">[{m.priority}]</span>
                        </div>
                        <div className="text-xs text-muted">{m.summary}</div>
                      </div>
                      <span className="font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {nextModule ? (
                  <button
                    onClick={learnNext}
                    disabled={loading}
                    className="rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] enabled:hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    ▶ teach me: {nextModule.title.slice(0, 28)}
                  </button>
                ) : (
                  <span className="rounded-lg border border-lime-deep/40 bg-lime/10 px-4 py-2.5 text-sm text-lime">
                    🎉 all modules taught
                  </span>
                )}
                <button
                  onClick={startReview}
                  disabled={loading || due.length === 0}
                  className="rounded-lg border border-line-strong px-5 py-2.5 text-sm text-text-dim transition-colors enabled:hover:border-lime enabled:hover:text-lime disabled:opacity-40"
                >
                  ↻ review {due.length} card{due.length === 1 ? "" : "s"}
                </button>
              </div>
              {Busy}
              {Err}
            </div>
          )}

          {/* ── lesson ── */}
          {phase === "lesson" && activeModule && (
            <div>
              <div className="kicker mb-2">lesson</div>
              <h2 className="font-display text-2xl text-text">{activeModule.title}</h2>
              <div className="post mt-4 whitespace-pre-line text-[15px] leading-relaxed text-text-dim">
                {lesson}
              </div>
              <button
                onClick={finishLesson}
                disabled={loading}
                className="mt-6 rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] enabled:hover:-translate-y-0.5 disabled:opacity-40"
              >
                got it — make flashcards →
              </button>
              {Busy}
              {Err}
            </div>
          )}

          {/* ── review ── */}
          {phase === "review" && queue[qi] && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="kicker">review · {qi + 1}/{queue.length}</div>
                <button onClick={() => setPhase("dashboard")} className="font-mono text-xs text-muted hover:text-lime">
                  ✕ exit
                </button>
              </div>
              <div className="rounded-xl border border-line bg-bg-elev p-6">
                <div className="text-lg text-text">{queue[qi].front}</div>
                {revealed && (
                  <div className="mt-4 border-t border-line pt-4 text-mint">{queue[qi].back}</div>
                )}
              </div>
              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="mt-5 rounded-lg border border-line-strong px-5 py-2.5 text-sm text-text-dim hover:border-lime hover:text-lime"
                >
                  reveal answer
                </button>
              ) : (
                <div className="mt-5">
                  <div className="mb-2 text-xs text-muted">How did you do?</div>
                  <div className="flex flex-wrap gap-2">
                    {RATINGS.map((r) => (
                      <button
                        key={r.q}
                        onClick={() => rate(r.q)}
                        className={`rounded-lg border px-4 py-2 text-sm transition-colors ${r.cls}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-8 border-t border-line pt-4 font-mono text-[11px] text-faint">
        runs on Gemini · your progress is saved in this browser ·{" "}
        <Link href="/learn" className="text-muted hover:text-lime">
          how it works
        </Link>
      </p>
    </div>
  );
}
