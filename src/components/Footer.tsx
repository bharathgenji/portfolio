import { profile } from "@/lib/data";

const links = [
  { label: "email", href: `mailto:${profile.email}` },
  { label: "linkedin", href: profile.linkedin },
  { label: "github", href: profile.github },
  { label: "playbook", href: "/playbook" },
  { label: "tutor", href: "/learn" },
  { label: "résumé", href: profile.resume },
];

export default function Footer() {
  return (
    <footer id="contact" className="relative mt-10 border-t border-line">
      <div className="mx-auto max-w-5xl px-5 py-20 sm:px-6">
        <div className="kicker mb-5">~/contact</div>
        <h2 className="font-display text-5xl leading-[0.95] text-text sm:text-7xl">
          Let&apos;s build something
          <br />
          <span className="text-grad italic">intelligent.</span>
        </h2>

        <div className="mt-10 flex flex-wrap gap-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 font-mono text-sm text-text-dim transition-colors hover:border-lime hover:text-lime"
            >
              {l.label}
              <span className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-lime">
                →
              </span>
            </a>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 font-mono text-[11px] text-faint">
          <span>
            {profile.location} · {profile.phone}
          </span>
          <span>
            built with Next.js · Tailwind · deployed on Vercel · © {profile.name}
          </span>
        </div>
      </div>
    </footer>
  );
}
