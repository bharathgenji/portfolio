import type { Metadata } from "next";
import Link from "next/link";
import { profile } from "@/lib/data";

export const metadata: Metadata = {
  title: "learn-agent — an adaptive AI tutor · Bharath Genji Mohanaranga",
  description:
    "An open-source, multi-agent CLI tutor that takes you from zero to your target level on any topic — adaptive diagnosis, personalized curriculum, spaced-repetition flashcards, and LLM-graded mastery checks.",
};

const REPO = `${profile.github}/portfolio/tree/main/tutor`;

const agents = [
  { name: "Diagnostician", role: "Asks adaptive questions to gauge what you already know" },
  { name: "Assessor", role: "Scores your level and pinpoints known concepts vs. gaps" },
  { name: "Planner", role: "Designs an ordered path from where you are → your goal" },
  { name: "Tutor", role: "Teaches each module with an analogy, example & check question" },
  { name: "Flashcards", role: "Generates cards and schedules them with SM-2 spaced repetition" },
  { name: "Examiner", role: "Quizzes you per module, grades answers, tracks mastery" },
];

const loop = [
  "diagnose",
  "assess gaps",
  "set goal",
  "plan",
  "teach",
  "flashcards",
  "review",
  "assess → mastery",
];

export default function LearnPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-28 pb-24 sm:px-6 sm:pt-32">
      <Link
        href="/#top"
        className="font-mono text-xs text-muted transition-colors hover:text-lime"
      >
        ← bharath.gm
      </Link>

      <header className="mt-8 border-b border-line pb-8">
        <div className="kicker mb-3">~/learn · open-source</div>
        <h1 className="font-display text-5xl leading-[0.95] text-text sm:text-6xl">
          learn-<span className="italic text-lime">agent</span>
        </h1>
        <p className="mt-4 max-w-xl text-text-dim">
          An adaptive, multi-agent tutor that takes you from zero to your target
          level on <span className="text-text">any</span> topic — right in your
          terminal. It figures out what you already know, then teaches only the
          gap, the way the science says actually works: active recall + spaced
          repetition + mastery checks.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/tutor"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] transition-transform hover:-translate-y-0.5"
          >
            ▶ try it live
          </Link>
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 text-sm text-text-dim transition-colors hover:border-lime hover:text-lime"
          >
            ❮❯ source
          </a>
          <a
            href="#run"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm text-muted transition-colors hover:text-text"
          >
            run in terminal →
          </a>
        </div>
      </header>

      {/* The loop */}
      <section className="mt-12">
        <div className="kicker mb-4">the loop</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[13px]">
          {loop.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-line bg-panel px-3 py-1 text-text-dim">
                {step}
              </span>
              {i < loop.length - 1 && <span className="text-lime">→</span>}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          If a mastery check comes back under 80%, the module loops back through
          review until it sticks — so you actually reach the level you set.
        </p>
      </section>

      {/* Agents */}
      <section className="mt-12">
        <div className="kicker mb-4">six specialized agents</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map((a, i) => (
            <div key={a.name} className="card p-5">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-lg text-faint/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl text-text">{a.name}</h3>
              </div>
              <p className="mt-2 text-sm text-text-dim">{a.role}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          Each agent is a focused, structured-output LLM call, orchestrated by
          plain code — a clean multi-agent system, not one mega-prompt. The model
          provider lives in a single swappable file.
        </p>
      </section>

      {/* Run */}
      <section id="run" className="mt-12 scroll-mt-24">
        <div className="kicker mb-4">run it</div>
        <div className="post">
          <pre>
            <code>{`# free Gemini key (no card): https://aistudio.google.com/apikey
export GEMINI_API_KEY=...

git clone ${profile.github}/portfolio && cd portfolio
npm install

node tutor/index.mjs learn  "quantum computing"   # diagnose, plan, teach
node tutor/index.mjs review "quantum computing"   # spaced-repetition review
node tutor/index.mjs assess "quantum computing"   # graded mastery check
node tutor/index.mjs status "quantum computing"   # progress to your goal`}</code>
          </pre>
        </div>
        <p className="mt-4 text-sm text-muted">
          Progress &amp; flashcard schedules persist in{" "}
          <code className="rounded border border-line bg-bg-elev px-1.5 py-0.5 font-mono text-[12px] text-mint">
            ~/.learn-agent
          </code>
          , so you can come back tomorrow and pick up exactly where you left off.
        </p>
      </section>

      <footer className="mt-14 border-t border-line pt-6 font-mono text-xs text-faint">
        built by {profile.name} ·{" "}
        <a href={REPO} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-lime">
          fork it
        </a>{" "}
        ·{" "}
        <Link href="/#top" className="text-muted hover:text-lime">
          back to portfolio
        </Link>
      </footer>
    </main>
  );
}
