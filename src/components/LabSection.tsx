import SectionHeading from "./SectionHeading";
import Playground from "./Playground";

export default function LabSection() {
  return (
    <section id="lab" className="mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-6">
      <SectionHeading
        index="05"
        kicker="~/lab --interactive"
        title="Try it"
        titleAccent="live"
      />
      <p className="-mt-5 mb-8 max-w-xl text-sm text-muted">
        The document-intelligence work I ship — running right here. Paste any
        document (or pick a sample) and watch a Gemini agent classify it, pull
        structured fields &amp; entities, and score its own confidence in real time.
      </p>
      <Playground />
    </section>
  );
}
