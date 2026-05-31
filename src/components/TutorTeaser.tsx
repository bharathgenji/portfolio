import Link from "next/link";
import { profile } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const steps = ["diagnose", "plan", "teach", "flashcards", "assess", "mastery"];

export default function TutorTeaser() {
  return (
    <section id="tutor" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-6">
      <SectionHeading
        index="08"
        kicker="~/learn · open-source"
        title="An AI tutor"
        titleAccent="I built"
      />
      <Reveal>
        <div className="card p-7">
          <p className="max-w-2xl text-text-dim">
            <span className="font-mono text-lime">learn-agent</span> — a
            multi-agent CLI that takes you from zero to your target level on{" "}
            <span className="text-text">any</span> topic. It diagnoses what you
            know, teaches only the gap, drills it with spaced-repetition
            flashcards, and grades you until you actually reach mastery.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[12px]">
            {steps.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-full border border-line bg-bg-elev px-2.5 py-1 text-text-dim">
                  {s}
                </span>
                {i < steps.length - 1 && <span className="text-lime">→</span>}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/tutor"
              className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-[#07080a] transition-transform hover:-translate-y-0.5"
            >
              ▶ try it live
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 text-sm text-text-dim transition-colors hover:border-lime hover:text-lime"
            >
              how it works →
            </Link>
            <a
              href={`${profile.github}/portfolio/tree/main/tutor`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm text-muted transition-colors hover:text-text"
            >
              ❮❯ source
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
