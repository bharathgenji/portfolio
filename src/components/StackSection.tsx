import { stack } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const labels: Record<string, string> = {
  genai_llms: "GenAI & LLMs",
  languages: "Languages",
  cloud_infra: "Cloud & Infra",
  data_streaming: "Data & Streaming",
  mlops_devops: "MLOps & DevOps",
};

export default function StackSection() {
  return (
    <section id="stack" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-6">
      <SectionHeading
        index="03"
        kicker="~/stack · skills.json"
        title="The"
        titleAccent="toolkit"
      />

      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {stack.map((group, gi) => (
          <Reveal key={group.group} delay={gi * 0.05}>
            <div className="grid grid-cols-1 gap-3 bg-panel p-6 sm:grid-cols-[14rem_1fr] sm:gap-6">
              <div className="flex items-start gap-3">
                <span aria-hidden className="font-display text-xl text-faint/60">
                  {String(gi + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl text-text">
                  {labels[group.group] ?? group.group}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-line bg-bg-elev px-3 py-1.5 font-mono text-[12px] text-text-dim transition-colors hover:border-lime hover:text-lime"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
