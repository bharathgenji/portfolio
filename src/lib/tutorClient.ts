// Client-side tutor state: lives in the visitor's localStorage (no backend DB,
// no login). Mirrors the CLI's state shape + SM-2 spaced repetition.

export type Module = {
  id: string;
  title: string;
  summary: string;
  priority: "core" | "review" | "stretch" | string;
  estMinutes?: number;
  status: "todo" | "learning" | "mastered" | "known";
  mastery: number;
};

export type Card = {
  id: string;
  moduleId: string;
  front: string;
  back: string;
  ease: number;
  intervalDays: number;
  reps: number;
  dueAt: string | null;
};

export type Assessment = { level: string; summary: string; known: string[]; gaps: string[] };

export type TutorState = {
  topic: string;
  slug: string;
  createdAt: string;
  targetLevel: string | null;
  assessment: Assessment | null;
  curriculum: Module[];
  flashcards: Card[];
};

const KEY = (slug: string) => `learn-agent:${slug}`;
const INDEX = "learn-agent:index";

export function slugify(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function loadState(slug: string): TutorState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY(slug));
    return raw ? (JSON.parse(raw) as TutorState) : null;
  } catch {
    return null;
  }
}

export function saveState(state: TutorState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(state.slug), JSON.stringify(state));
  try {
    const idx: string[] = JSON.parse(localStorage.getItem(INDEX) || "[]");
    if (!idx.includes(state.slug)) {
      idx.push(state.slug);
      localStorage.setItem(INDEX, JSON.stringify(idx));
    }
  } catch {
    localStorage.setItem(INDEX, JSON.stringify([state.slug]));
  }
}

export function listStates(): TutorState[] {
  if (typeof window === "undefined") return [];
  try {
    const idx: string[] = JSON.parse(localStorage.getItem(INDEX) || "[]");
    return idx.map((s) => loadState(s)).filter(Boolean) as TutorState[];
  } catch {
    return [];
  }
}

export function newState(topic: string): TutorState {
  return {
    topic,
    slug: slugify(topic),
    createdAt: new Date().toISOString(),
    targetLevel: null,
    assessment: null,
    curriculum: [],
    flashcards: [],
  };
}

export function toModules(raw: Omit<Module, "status" | "mastery">[]): Module[] {
  return raw.map((m) => ({
    ...m,
    status: m.priority === "review" ? "known" : "todo",
    mastery: m.priority === "review" ? 0.6 : 0,
  }));
}

// ── SM-2 ─────────────────────────────────────────────────────────────────────
const DAY = 86_400_000;

export function reviewCard(card: Card, quality: number, nowMs = Date.now()): Card {
  let ease = card.ease ?? 2.5;
  let intervalDays = card.intervalDays ?? 0;
  let reps = card.reps ?? 0;
  if (quality < 3) {
    reps = 0;
    intervalDays = 1;
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease < 1.3) ease = 1.3;
  }
  return {
    ...card,
    ease: Math.round(ease * 100) / 100,
    intervalDays,
    reps,
    dueAt: new Date(nowMs + intervalDays * DAY).toISOString(),
  };
}

export function isDue(card: Card, nowMs = Date.now()): boolean {
  return !card.dueAt || new Date(card.dueAt).getTime() <= nowMs;
}

export function dueCards(cards: Card[], nowMs = Date.now()): Card[] {
  return cards.filter((c) => isDue(c, nowMs));
}

// ── API helper ───────────────────────────────────────────────────────────────
export async function callTutor(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
