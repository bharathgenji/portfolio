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

type Phase = "intro" | "diagnose" | "goal" | "dashboard" | "lesson" | "review" | "assess";

const MASTERY_PASS = 0.8;
const DONE = new Set(["mastered", "known"]);

type GradeResult = {
  overallScore: number;
  summary: string;
  results: { verdict: string; score: number; feedback: string }[];
};

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
  const [exam, setExam] = useState<{ id: string; question: string }[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);
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
  const reached = useMemo(() => {
    const core = state?.curriculum.filter((m) => m.priority === "core") ?? [];
    return core.length > 0 && core.every((m) => DONE.has(m.status));
  }, [state]);

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

  function learnModule(mod: Module) {
    if (!state) return;
    run("Preparing your lesson…", async () => {
      const { text } = await callTutor("teach", {
        topic: state.topic,
        module: mod,
        level: state.assessment?.level,
      });
      setActiveModule(mod);
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

  function assessModule(mod: Module) {
    if (!state) return;
    run("Writing your mastery check…", async () => {
      const { questions: qs } = await callTutor("exam", {
        topic: state.topic,
        module: mod,
        level: state.assessment?.level,
      });
      setActiveModule(mod);
      setExam(qs || []);
      setExamAnswers({});
      setGrade(null);
      setPhase("assess");
    });
  }

  function submitAssess() {
    if (!state || !activeModule) return;
    const qa = exam.map((q) => ({ question: q.question, answer: examAnswers[q.id] || "" }));
    run("Grading your answers…", async () => {
      const g = (await callTutor("grade", {
        topic: state.topic,
        module: activeModule,
        qa,
      })) as GradeResult;
      const score = g.overallScore ?? 0;
      const curriculum = state.curriculum.map((m) =>
        m.id === activeModule.id
          ? {
              ...m,
              mastery: Math.round(score * 100) / 100,
              status: score >= MASTERY_PASS ? ("mastered" as const) : m.status,
            }
          : m,
      );
      persist({ ...state, curriculum });
      setGrade(g);
    });
  }

  function finishAssess() {
    setGrade(null);
    setExam([]);
    setActiveModule(null);
    setPhase("dashboard");
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
              {reached && (
                <div className="mb-5 rounded-xl border border-lime-deep/40 bg-lime/10 p-4 text-sm text-lime">
                  🎉 You&apos;ve reached <b>{state.targetLevel}</b> on {state.topic} — every
                  core module mastered. Keep reviewing to make it stick.
                </div>
              )}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="kicker">curriculum → {state.targetLevel}</div>
                <div className="font-mono text-xs text-muted">
                  {state.curriculum.filter((m) => DONE.has(m.status)).length}/
                  {state.curriculum.length} mastered · {due.length} due
                </div>
              </div>

              <div className="space-y-2">
                {state.curriculum.map((m) => {
                  const mastered = DONE.has(m.status);
                  const icon = mastered ? "●" : m.status === "learning" ? "◐" : "○";
                  const col = mastered ? "text-lime" : m.status === "learning" ? "text-amber" : "text-faint";
                  const fill = Math.max(0, Math.min(10, Math.round((m.mastery || 0) * 10)));
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border border-line bg-bg-elev/50 px-3 py-2.5"
                    >
                      <span className={`font-mono ${col}`}>{icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-text">
                          {m.title}{" "}
                          <span className="font-mono text-[10px] text-faint">[{m.priority}]</span>
                        </div>
                        <div className="truncate text-xs text-muted">{m.summary}</div>
                        {(m.status === "learning" || mastered) && (
                          <div className="mt-1 font-mono text-[10px]">
                            <span className="text-lime">{"█".repeat(fill)}</span>
                            <span className="text-faint">
                              {"░".repeat(10 - fill)} {Math.round((m.mastery || 0) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      {m.status === "todo" && (
                        <button
                          onClick={() => learnModule(m)}
                          disabled={loading}
                          className="shrink-0 rounded-md border border-line-strong px-3 py-1 font-mono text-xs text-text-dim transition-colors enabled:hover:border-lime enabled:hover:text-lime disabled:opacity-40"
                        >
                          learn
                        </button>
                      )}
                      {m.status === "learning" && (
                        <button
                          onClick={() => assessModule(m)}
                          disabled={loading}
                          className="shrink-0 rounded-md border border-amber/40 px-3 py-1 font-mono text-xs text-amber transition-colors enabled:hover:bg-amber/10 disabled:opacity-40"
                        >
                          assess
                        </button>
                      )}
                      {mastered && <span className="shrink-0 font-mono text-xs text-lime">✓</span>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {nextModule && (
                  <button
                    onClick={() => learnModule(nextModule)}
                    disabled={loading}
                    className="rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] enabled:hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    ▶ next lesson
                  </button>
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

          {/* ── assess ── */}
          {phase === "assess" && activeModule && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="kicker">mastery check · {activeModule.title}</div>
                <button onClick={finishAssess} className="font-mono text-xs text-muted hover:text-lime">
                  ✕ exit
                </button>
              </div>

              {!grade ? (
                <>
                  <p className="mb-4 text-sm text-muted">
                    Answer in your own words — this decides if the module is mastered.
                  </p>
                  <div className="space-y-4">
                    {exam.map((q, i) => (
                      <div key={q.id}>
                        <label className="text-sm text-text-dim">
                          <span className="mr-2 font-mono text-faint">{String(i + 1).padStart(2, "0")}</span>
                          {q.question}
                        </label>
                        <textarea
                          value={examAnswers[q.id] || ""}
                          onChange={(e) => setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                          rows={2}
                          className="mt-1.5 w-full resize-none rounded-lg border border-line bg-bg-elev px-3 py-2 font-mono text-[13px] text-text outline-none focus:border-lime"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={submitAssess}
                    disabled={loading}
                    className="mt-5 rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] enabled:hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    submit for grading →
                  </button>
                </>
              ) : (
                <div>
                  <div
                    className={`mb-4 rounded-xl border p-4 ${
                      grade.overallScore >= MASTERY_PASS
                        ? "border-lime-deep/40 bg-lime/10"
                        : "border-amber/30 bg-amber/5"
                    }`}
                  >
                    <div className="font-display text-2xl text-text">
                      {Math.round(grade.overallScore * 100)}%{" "}
                      {grade.overallScore >= MASTERY_PASS ? (
                        <span className="text-lime">— mastered ✓</span>
                      ) : (
                        <span className="text-amber">— not yet</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-text-dim">{grade.summary}</div>
                  </div>
                  <div className="space-y-3">
                    {grade.results.map((r, i) => {
                      const mark = r.verdict === "correct" ? "✓" : r.verdict === "partial" ? "≈" : "✗";
                      const col = r.verdict === "correct" ? "text-lime" : "text-amber";
                      return (
                        <div key={i} className="text-sm">
                          <div className={`${col} font-mono`}>
                            {mark} {exam[i]?.question}
                          </div>
                          <div className="mt-0.5 text-text-dim">{r.feedback}</div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={finishAssess}
                    className="mt-6 rounded-lg bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] hover:-translate-y-0.5"
                  >
                    {grade.overallScore >= MASTERY_PASS ? "continue →" : "back to plan →"}
                  </button>
                </div>
              )}
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
