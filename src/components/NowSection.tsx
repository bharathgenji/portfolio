import { now } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const statusStyle: Record<string, { dot: string; text: string }> = {
  running: { dot: "bg-lime", text: "text-lime" },
  building: { dot: "bg-amber", text: "text-amber" },
};

export default function NowSection() {
  return (
    <section id="now" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-6">
      <SectionHeading index="01" kicker="~/now" title="Currently" titleAccent="building" />

      <Reveal className="mb-5 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-line bg-panel/40 px-5 py-4">
        <div className="font-mono text-sm">
          <span className="text-text">{now.role}</span>{" "}
          <span className="text-lime">@ {now.company}</span>
        </div>
        <div className="font-mono text-xs text-muted">
          {now.period} · {now.location}
        </div>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2">
        {now.processes.map((p, i) => {
          const st = statusStyle[p.status];
          return (
            <Reveal key={p.name} delay={i * 0.1}>
              <article className="card flex h-full flex-col p-6">
                <div className="flex items-center gap-2.5">
                  <span className={`live-dot h-2 w-2 rounded-full ${st.dot}`} />
                  <h3 className="font-display text-2xl text-text">{p.name}</h3>
                  <span className={`ml-auto font-mono text-[11px] ${st.text}`}>
                    [{p.status}]
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-text-dim">
                  {p.desc}
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {p.metrics.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-lime-deep/40 bg-lime-glow px-2.5 py-0.5 font-mono text-[11px] text-lime"
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <div className="mt-auto border-t border-line pt-4 font-mono text-[11px] text-faint">
                  {p.tech.join("  ·  ")}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.15}>
        <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {now.extras.map((e) => (
            <li key={e} className="flex gap-3 text-sm text-text-dim">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime" />
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
