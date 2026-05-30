import { work } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function WorkSection() {
  return (
    <section id="work" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-6">
      <SectionHeading
        index="02"
        kicker="~/work"
        title="What I've"
        titleAccent="shipped"
      />

      <div className="flex flex-col">
        {work.map((job, i) => (
          <Reveal key={job.company + job.period} delay={i * 0.05}>
            <article className="group grid grid-cols-1 gap-4 border-b border-line py-7 transition-colors hover:border-line-strong sm:grid-cols-[auto_1fr] sm:gap-8">
              {/* left rail: index + period */}
              <div className="flex items-baseline gap-3 sm:w-44 sm:flex-col sm:gap-2">
                <span
                  aria-hidden
                  className="font-display text-3xl text-faint/60 transition-colors group-hover:text-lime"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs text-muted">{job.period}</span>
              </div>

              {/* right: content */}
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h3 className="font-display text-2xl text-text sm:text-3xl">
                    {job.company}
                  </h3>
                  <span className="font-mono text-xs text-lime">{job.role}</span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-faint">
                  {job.location}
                </div>

                <ul className="mt-4 space-y-2">
                  {job.highlights.map((h, j) => (
                    <li key={j} className="flex gap-3 text-sm leading-relaxed text-text-dim">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime-deep" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {job.tech.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-line bg-bg-elev px-2.5 py-0.5 font-mono text-[11px] text-text-dim"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
