import type { Metadata } from "next";
import Link from "next/link";
import TutorApp from "@/components/TutorApp";

export const metadata: Metadata = {
  title: "learn-agent — try the AI tutor · Bharath Genji Mohanaranga",
  description:
    "An adaptive AI tutor in your browser: it diagnoses what you know about any topic, builds a personalized curriculum, teaches it, and drills you with spaced-repetition flashcards.",
};

export default function TutorPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-28 pb-24 sm:px-6 sm:pt-32">
      <Link
        href="/learn"
        className="font-mono text-xs text-muted transition-colors hover:text-lime"
      >
        ← how it works
      </Link>
      <header className="mt-8 mb-8">
        <div className="kicker mb-3">~/learn · live</div>
        <h1 className="font-display text-4xl leading-[0.95] text-text sm:text-5xl">
          Learn <span className="italic text-lime">anything</span>
        </h1>
        <p className="mt-3 max-w-xl text-text-dim">
          A multi-agent tutor that meets you where you are and takes you to your
          goal — diagnose, plan, teach, and reinforce with spaced repetition.
          Your progress is saved right in this browser.
        </p>
      </header>
      <TutorApp />
    </main>
  );
}
