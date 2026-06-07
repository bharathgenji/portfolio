import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Adept — become an expert at anything",
  description:
    "Adept is an AI tutor that diagnoses what you know, builds a personalized path, teaches it, and drills you with spaced repetition until you reach mastery.",
};

export default function AdeptLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0c11] font-sans text-[#e7e9ee] antialiased">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0c11]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3.5 sm:px-6">
          <Link href="/adept" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#6d8bff] text-sm font-bold text-[#0a0c11]">
              A
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Adept</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link
              href="/adept/app"
              className="rounded-lg px-3 py-1.5 text-[#aab0bd] transition-colors hover:text-white"
            >
              App
            </Link>
            <Link
              href="/adept/login"
              className="rounded-lg bg-[#6d8bff] px-4 py-1.5 font-medium text-[#0a0c11] transition-transform hover:-translate-y-0.5"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-6 text-xs text-[#6b7280] sm:px-6">
          <span>Adept · an AI tutor for anything</span>
          <Link href="/" className="hover:text-[#aab0bd]">
            ← back to bharath.gm
          </Link>
        </div>
      </footer>
    </div>
  );
}
