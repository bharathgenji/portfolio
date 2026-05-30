"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { profile, stats } from "@/lib/data";

const PHRASES = [
  "production multi-agent systems",
  "LangGraph & Google ADK agents",
  "RAG pipelines & cross-cloud MLOps",
];

function useTypewriter(phrases: string[]) {
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = phrases[idx];
    if (!deleting && text === full) {
      const t = setTimeout(() => setDeleting(true), 1900);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      const t = setTimeout(() => {
        setDeleting(false);
        setIdx((i) => (i + 1) % phrases.length);
      }, 380);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => {
        setText((cur) =>
          deleting ? full.slice(0, cur.length - 1) : full.slice(0, cur.length + 1),
        );
      },
      deleting ? 28 : 52,
    );
    return () => clearTimeout(t);
  }, [text, deleting, idx, phrases]);

  return text;
}

const ease = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  const typed = useTypewriter(PHRASES);

  return (
    <section
      id="top"
      className="relative mx-auto max-w-5xl px-5 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-24"
    >
      {/* availability chip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-1.5 backdrop-blur-sm"
      >
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-lime" />
        <span className="font-mono text-xs text-text-dim">
          {profile.location} · open to AI engineering roles
        </span>
      </motion.div>

      {/* name */}
      <motion.h1
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="font-display text-[3.4rem] leading-[0.92] tracking-tight text-text sm:text-8xl"
      >
        Bharath Genji
        <br />
        <span className="text-grad italic">Mohanaranga</span>
      </motion.h1>

      {/* typed line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm text-muted sm:text-base"
      >
        <span className="text-lime">❯</span>
        <span className="text-text-dim">AI Engineer — shipping</span>
        <span className="text-text">{typed}</span>
        <span className="caret" aria-hidden />
      </motion.div>

      {/* summary */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease }}
        className="mt-8 max-w-2xl text-base leading-relaxed text-text-dim sm:text-lg"
      >
        {profile.summary}
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45, ease }}
        className="mt-9 flex flex-wrap items-center gap-3"
      >
        <a
          href="#news"
          className="group inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] transition-transform hover:-translate-y-0.5"
        >
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#07080a]" />
          live AI news
        </a>
        <a
          href="#work"
          className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 text-sm text-text-dim transition-colors hover:border-lime hover:text-lime"
        >
          view work →
        </a>
        <a
          href={profile.resume}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm text-muted transition-colors hover:text-text"
        >
          résumé ↓
        </a>
      </motion.div>

      {/* stats */}
      <motion.dl
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } },
        }}
        className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4"
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0 },
            }}
            className="bg-panel p-5"
          >
            <dt className="font-display text-3xl text-lime sm:text-4xl">
              {s.value}
            </dt>
            <dd className="mt-1.5 text-xs leading-tight text-muted">{s.label}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </section>
  );
}
