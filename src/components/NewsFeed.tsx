"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { fetchAllNews, timeAgo, type Story } from "@/lib/news";

const REFRESH_MS = 90_000; // auto-refresh every 90s

type State = "loading" | "ready" | "error";

export default function NewsFeed() {
  const [stories, setStories] = useState<Story[]>([]);
  const [state, setState] = useState<State>("loading");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await fetchAllNews(controller.signal);
      if (controller.signal.aborted) return;
      setStories(data);
      setLastUpdated(Date.now());
      setState("ready");
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((prev) => (prev === "ready" ? "ready" : "error"));
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const poll = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(poll);
      abortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const iv = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel/60 backdrop-blur-sm">
      {/* header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bg-elev/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          {state === "ready" ? (
            <>
              <span className="live-dot h-2 w-2 rounded-full bg-lime" />
              <span data-testid="news-live" className="font-mono text-xs font-semibold text-lime">
                LIVE
              </span>
            </>
          ) : state === "loading" ? (
            <span className="font-mono text-xs text-amber">connecting…</span>
          ) : (
            <span className="font-mono text-xs text-red">offline · retrying</span>
          )}
        </div>

        <div className="flex items-center gap-x-4 font-mono text-[11px] text-muted">
          <span>
            <span className="text-faint">items</span> {stories.length}
          </span>
          <span className="hidden sm:inline">
            <span className="text-faint">refresh</span> 90s
          </span>
          {lastUpdated !== null && (
            <span>
              <span className="text-faint">updated</span>{" "}
              <span className="text-lime">{timeAgo(lastUpdated / 1000, now)}</span>
            </span>
          )}
        </div>

        <button
          onClick={load}
          data-testid="news-refresh"
          className="ml-auto rounded-full border border-line px-3 py-1 font-mono text-[11px] text-muted transition-colors hover:border-lime hover:text-lime"
        >
          ↻ refresh
        </button>
      </div>

      {/* list */}
      <div className="max-h-[36rem] divide-y divide-line overflow-y-auto">
        {state === "loading" && stories.length === 0 && <SkeletonRows />}

        {state === "error" && stories.length === 0 && (
          <div className="m-4 rounded-xl border border-red/30 bg-red/5 p-4 text-sm text-red">
            ⚠ Couldn&apos;t reach the news sources. Retrying automatically.
            <button
              onClick={load}
              className="ml-2 underline underline-offset-2 hover:text-text"
            >
              retry now
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {stories.map((s, i) => (
            <motion.div
              key={s.id}
              data-testid="news-item"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.015 }}
              className="group relative px-5 py-3.5 transition-colors hover:bg-panel-2"
            >
              <div className="flex items-start gap-4">
                <span className="mt-1 select-none font-mono text-[11px] text-faint tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="news-item-link"
                    className="text-[15px] leading-snug text-text transition-colors after:absolute after:inset-0 group-hover:text-lime"
                  >
                    {s.title}
                  </a>
                  <div className="relative z-10 mt-1.5 flex w-fit flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[11px] text-muted">
                    <span className="rounded border border-line bg-bg-elev px-1.5 py-px text-[10px] text-amber">
                      {s.source}
                    </span>
                    <span className="text-mint">{s.domain}</span>
                    {s.points !== undefined && (
                      <>
                        <span className="text-faint">·</span>
                        <span>▲ {s.points}</span>
                      </>
                    )}
                    {s.commentsUrl && (
                      <>
                        <span className="text-faint">·</span>
                        <a
                          href={s.commentsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-10 hover:text-amber"
                        >
                          💬 {s.comments}
                        </a>
                      </>
                    )}
                    <span className="text-faint">·</span>
                    <span>{timeAgo(s.createdAt, now)}</span>
                  </div>
                </div>
                <span className="mt-0.5 select-none text-faint opacity-0 transition-opacity group-hover:opacity-100">
                  ↗
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="border-t border-line px-5 py-3 font-mono text-[11px] text-faint">
        sources: Hacker News + TechCrunch · The Verge · Ars Technica · VentureBeat
        — merged, deduped · no tracking · 24/7
      </p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-3.5"
          style={{ opacity: 1 - i * 0.11 }}
        >
          <div className="h-3 w-5 rounded bg-line" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-line-strong" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}
