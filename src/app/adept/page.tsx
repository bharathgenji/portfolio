import Link from "next/link";

const steps = [
  { t: "Diagnose", d: "Answer a few questions so Adept knows exactly where you stand." },
  { t: "Plan", d: "Get a personalized curriculum from your level to your goal." },
  { t: "Learn", d: "Clear lessons with analogies, examples, and check questions." },
  { t: "Remember", d: "Auto-generated flashcards on a spaced-repetition schedule." },
  { t: "Master", d: "Graded mastery checks loop you back until it sticks." },
];

export default function AdeptLanding() {
  return (
    <main className="mx-auto max-w-5xl px-5 sm:px-6">
      {/* hero */}
      <section className="py-20 sm:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-[#aab0bd]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6d8bff]" /> AI-powered · adaptive
        </div>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Become an expert at{" "}
          <span className="bg-gradient-to-r from-[#6d8bff] to-[#9b8bff] bg-clip-text text-transparent">
            anything.
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[#aab0bd]">
          Adept is your personal AI tutor. Tell it what you want to learn — it figures
          out what you already know, builds a path to your goal, teaches you, and makes
          sure it sticks.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/adept/login"
            className="rounded-xl bg-[#6d8bff] px-6 py-3 font-semibold text-[#0a0c11] transition-transform hover:-translate-y-0.5"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/tutor"
            className="rounded-xl border border-white/[0.12] px-6 py-3 text-[#dfe2e8] transition-colors hover:border-[#6d8bff]"
          >
            Try the demo
          </Link>
        </div>
      </section>

      {/* how it works */}
      <section className="border-t border-white/[0.06] py-16">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-[#6d8bff]">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <div
              key={s.t}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"
            >
              <div className="text-xs text-[#6b7280]">{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-1 text-lg font-semibold">{s.t}</div>
              <div className="mt-1.5 text-sm text-[#aab0bd]">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-16 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Start learning in 30 seconds.</h2>
        <p className="mx-auto mt-3 max-w-md text-[#aab0bd]">
          Free to start. Your progress syncs to your account across every device.
        </p>
        <Link
          href="/adept/login"
          className="mt-6 inline-block rounded-xl bg-[#6d8bff] px-6 py-3 font-semibold text-[#0a0c11] transition-transform hover:-translate-y-0.5"
        >
          Create your free account →
        </Link>
      </section>
    </main>
  );
}
