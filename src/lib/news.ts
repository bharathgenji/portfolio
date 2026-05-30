// ─────────────────────────────────────────────────────────────────────────
// Unified news layer. Two sources, merged client-side:
//   1. Hacker News  — Algolia API, fetched directly in the browser (no key)
//   2. RSS          — TechCrunch / The Verge / Ars Technica / VentureBeat,
//                     fetched via our /api/news serverless route (avoids CORS)
// ─────────────────────────────────────────────────────────────────────────

export type Story = {
  id: string;
  title: string;
  url: string; // the article
  source: string; // "Hacker News" | "TechCrunch" | ...
  domain: string;
  points?: number; // HN only
  comments?: number; // HN only
  commentsUrl?: string; // HN discussion thread
  createdAt: number; // unix seconds
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── Hacker News (client-side) ──────────────────────────────────────────────

type AlgoliaHit = {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
};

const HN_QUERIES = ["AI", "LLM", "GPT", "machine learning", "agents"];
const HN_ENDPOINT = "https://hn.algolia.com/api/v1/search_by_date";

async function fetchHNQuery(query: string, signal?: AbortSignal): Promise<Story[]> {
  const params = new URLSearchParams({
    query,
    tags: "story",
    hitsPerPage: "15",
    numericFilters: "points>20",
  });
  const res = await fetch(`${HN_ENDPOINT}?${params}`, { signal });
  if (!res.ok) throw new Error(`HN API ${res.status}`);
  const data = (await res.json()) as { hits: AlgoliaHit[] };
  return data.hits
    .filter((h) => h.title)
    .map((h): Story => {
      const hnUrl = `https://news.ycombinator.com/item?id=${h.objectID}`;
      const url = h.url || hnUrl;
      return {
        id: `hn-${h.objectID}`,
        title: h.title as string,
        url,
        source: "Hacker News",
        domain: domainOf(url) || "news.ycombinator.com",
        points: h.points ?? 0,
        comments: h.num_comments ?? 0,
        commentsUrl: hnUrl,
        createdAt: h.created_at_i,
      };
    });
}

async function fetchHN(signal?: AbortSignal): Promise<Story[]> {
  const results = await Promise.allSettled(
    HN_QUERIES.map((q) => fetchHNQuery(q, signal)),
  );
  const out: Story[] = [];
  for (const r of results) if (r.status === "fulfilled") out.push(...r.value);
  return out;
}

// ── RSS (via our serverless route) ─────────────────────────────────────────

async function fetchRSS(signal?: AbortSignal): Promise<Story[]> {
  const res = await fetch("/api/news", { signal });
  if (!res.ok) throw new Error(`RSS route ${res.status}`);
  const data = (await res.json()) as { stories: Story[] };
  return data.stories ?? [];
}

// ── Merge + dedupe ─────────────────────────────────────────────────────────

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Fetch both sources in parallel, merge, dedupe and sort newest-first. */
export async function fetchAllNews(signal?: AbortSignal): Promise<Story[]> {
  const [hn, rss] = await Promise.allSettled([
    fetchHN(signal),
    fetchRSS(signal),
  ]);

  const hnStories = hn.status === "fulfilled" ? hn.value : [];
  const rssStories = rss.status === "fulfilled" ? rss.value : [];

  if (hnStories.length === 0 && rssStories.length === 0) {
    throw new Error("No stories from any source");
  }

  // HN first (richer metadata), then RSS — skip near-duplicate titles/urls.
  const seenTitle = new Set<string>();
  const seenUrl = new Set<string>();
  const merged: Story[] = [];

  for (const s of [...hnStories, ...rssStories]) {
    const nt = normalizeTitle(s.title);
    if (!nt || seenTitle.has(nt) || seenUrl.has(s.url)) continue;
    seenTitle.add(nt);
    seenUrl.add(s.url);
    merged.push(s);
  }

  return merged.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function timeAgo(unixSeconds: number, nowMs: number): string {
  const diff = Math.max(0, Math.floor(nowMs / 1000 - unixSeconds));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
