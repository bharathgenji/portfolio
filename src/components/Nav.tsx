"use client";

import { useEffect, useState } from "react";
import { profile } from "@/lib/data";

const LINKS = [
  { id: "now", label: "now" },
  { id: "work", label: "work" },
  { id: "stack", label: "stack" },
  { id: "projects", label: "projects" },
  { id: "lab", label: "lab" },
  { id: "news", label: "news" },
];

export default function Nav() {
  const [active, setActive] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
      <nav
        className={`flex w-full max-w-5xl items-center gap-3 rounded-full px-3 py-2 transition-all duration-300 sm:px-4 ${
          scrolled
            ? "border border-line bg-[#07080a]/70 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            : "border border-transparent bg-transparent"
        }`}
      >
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-lime font-mono text-[13px] font-bold text-[#07080a]">
            b
          </span>
          <span className="hidden font-mono text-sm text-text sm:inline">
            bharath<span className="text-faint">.gm</span>
          </span>
        </a>

        <ul className="mx-auto flex items-center gap-0.5 font-mono text-[13px] sm:gap-1">
          {LINKS.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`relative rounded-full px-1.5 py-1.5 transition-colors sm:px-3 ${
                  active === id ? "text-[#07080a]" : "text-muted hover:text-text"
                }`}
              >
                {active === id && (
                  <span className="absolute inset-0 -z-0 rounded-full bg-lime" />
                )}
                <span className="relative z-10">{label}</span>
              </a>
            </li>
          ))}
        </ul>

        <a
          href={profile.resume}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 font-mono text-[13px] text-text-dim transition-colors hover:border-lime hover:text-lime sm:flex"
        >
          résumé ↓
        </a>
      </nav>
    </header>
  );
}
