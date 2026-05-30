import { projects, education, accomplishments } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function ProjectsSection() {
  return (
    <section
      id="projects"
      className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-6"
    >
      <SectionHeading
        index="04"
        kicker="~/projects"
        title="Side quests"
        titleAccent="& wins"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.08}>
            <article className="card flex h-full flex-col p-6">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-2xl text-text">{p.name}</h3>
                <span className="font-mono text-xs text-faint">{p.period}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-dim">{p.desc}</p>
              <div className="mt-auto pt-4 font-mono text-[12px] text-lime">
                ▲ {p.result}
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Reveal>
          <div className="card h-full p-6">
            <div className="kicker mb-4">education</div>
            <ul className="space-y-4">
              {education.map((e) => (
                <li key={e.degree} className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-sm text-text">{e.degree}</div>
                    <div className="font-mono text-xs text-muted">{e.school}</div>
                  </div>
                  <div className="shrink-0 text-right font-mono text-[11px] text-faint">
                    <div>{e.period}</div>
                    <div className="text-lime">{e.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="card h-full p-6">
            <div className="kicker mb-4">accomplishments</div>
            <ul className="space-y-3">
              {accomplishments.map((a) => (
                <li key={a} className="flex gap-3 text-sm text-text-dim">
                  <span className="mt-0.5 text-amber">★</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
