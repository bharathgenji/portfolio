import Link from "next/link";
import { getPosts, formatDate } from "@/lib/playbook";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function PlaybookTeaser() {
  const posts = getPosts().slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section id="playbook" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-6">
      <SectionHeading
        index="07"
        kicker="~/playbook"
        title="Field notes on"
        titleAccent="AI agents"
      />
      <p className="-mt-5 mb-8 max-w-xl text-sm text-muted">
        Practical, no-fluff writing on what you can actually build with AI agents
        — patterns, gotchas, and lessons from production.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.08}>
            <Link href={`/playbook/${p.slug}`} className="card group flex h-full flex-col p-6">
              <div className="font-mono text-[11px] text-faint">
                {formatDate(p.date)}
              </div>
              <h3 className="mt-2 font-display text-xl leading-tight text-text transition-colors group-hover:text-lime">
                {p.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-dim">
                {p.summary}
              </p>
              <span className="mt-auto pt-4 font-mono text-xs text-muted transition-colors group-hover:text-lime">
                read →
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <Link
          href="/playbook"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 text-sm text-text-dim transition-colors hover:border-lime hover:text-lime"
        >
          all posts →
        </Link>
      </Reveal>
    </section>
  );
}
