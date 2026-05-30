import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, formatDate } from "@/lib/playbook";

export const metadata: Metadata = {
  title: "The Playbook — AI agent tips & patterns · Bharath Genji Mohanaranga",
  description:
    "Practical, no-fluff notes on building with AI agents — patterns, gotchas, and what you can actually ship. By Bharath Genji Mohanaranga.",
};

export default function PlaybookIndex() {
  const posts = getPosts();

  return (
    <main className="mx-auto max-w-3xl px-5 pt-28 pb-24 sm:px-6 sm:pt-32">
      <Link
        href="/#top"
        className="font-mono text-xs text-muted transition-colors hover:text-lime"
      >
        ← bharath.gm
      </Link>

      <header className="mt-8 border-b border-line pb-8">
        <div className="kicker mb-3">~/playbook</div>
        <h1 className="font-display text-5xl leading-[0.95] text-text sm:text-6xl">
          The <span className="italic text-lime">Playbook</span>
        </h1>
        <p className="mt-4 max-w-xl text-text-dim">
          Practical, no-fluff notes on building with AI agents — patterns,
          gotchas, and what you can actually ship. Written from production
          experience, not hype.
        </p>
      </header>

      <ul className="mt-8 divide-y divide-line">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/playbook/${p.slug}`}
              className="group block py-7 transition-colors"
            >
              <div className="flex items-baseline gap-3 font-mono text-[11px] text-faint">
                <span>{formatDate(p.date)}</span>
                {p.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-mint">
                    #{t}
                  </span>
                ))}
              </div>
              <h2 className="mt-2 font-display text-2xl text-text transition-colors group-hover:text-lime sm:text-3xl">
                {p.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-dim">
                {p.summary}
              </p>
              <span className="mt-3 inline-block font-mono text-xs text-muted transition-colors group-hover:text-lime">
                read →
              </span>
            </Link>
          </li>
        ))}

        {posts.length === 0 && (
          <li className="py-10 font-mono text-sm text-faint">
            No posts yet — the first one is on its way.
          </li>
        )}
      </ul>
    </main>
  );
}
