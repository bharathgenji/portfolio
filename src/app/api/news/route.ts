import { XMLParser } from "fast-xml-parser";
import type { Story } from "@/lib/news";

// Cache upstream + response for 10 minutes. The client polls every 90s, so
// most requests are served from cache — well within Vercel's free limits,
// while still staying fresh 24/7.
export const revalidate = 600;

type Feed = { source: string; url: string };

const FEEDS: Feed[] = [
  { source: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { source: "VentureBeat", url: "https://venturebeat.com/category/ai/feed/" },
  { source: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
];

// Keep general-tech feeds focused on AI/tech-relevant items.
const AI_KEYWORDS =
  /\b(ai|a\.i\.|artificial intelligence|llm|gpt|openai|anthropic|claude|gemini|chatbot|machine learning|ml|neural|model|agent|deepmind|nvidia|robot|automation|generative)\b/i;
const ALWAYS_INCLUDE = new Set(["TechCrunch", "VentureBeat"]); // already AI-only feeds

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

// WordPress feeds (TechCrunch/VentureBeat) double-encode entities, so after the
// XML parser decodes &amp; we're left with literal &#8217; etc. Decode those.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”");
}

function textOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "#text" in v) {
    return String((v as { "#text": unknown })["#text"] ?? "");
  }
  return "";
}

// Atom <link> can be a string, an object with @_href, or an array of those.
function atomLink(link: unknown): string {
  for (const l of asArray(link as unknown[])) {
    if (l && typeof l === "object") {
      const obj = l as Record<string, unknown>;
      const rel = obj["@_rel"];
      if (rel === undefined || rel === "alternate") {
        const href = obj["@_href"];
        if (typeof href === "string") return href;
      }
    } else if (typeof l === "string") {
      return l;
    }
  }
  return "";
}

type RawItem = Record<string, unknown>;

function parseFeed(xml: string, feed: Feed): Story[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const channel = (doc.rss as Record<string, unknown> | undefined)?.channel as
    | Record<string, unknown>
    | undefined;
  const atomFeed = doc.feed as Record<string, unknown> | undefined;

  // RSS 2.0 → channel.item ; Atom → feed.entry
  const items = asArray<RawItem>(
    (channel?.item ?? atomFeed?.entry) as RawItem | RawItem[] | undefined,
  );

  const stories: Story[] = [];
  for (const item of items) {
    const title = decodeEntities(textOf(item.title).trim());
    if (!title) continue;

    // RSS link is text; Atom link is an attribute object
    let url = textOf(item.link).trim();
    if (!url) url = atomLink(item.link);
    if (!url) continue;

    // RSS: pubDate ; Atom: published / updated
    const dateStr =
      textOf(item.pubDate) ||
      textOf(item.published) ||
      textOf(item.updated) ||
      "";
    const ms = dateStr ? Date.parse(dateStr) : NaN;
    const createdAt = Number.isNaN(ms) ? Math.floor(Date.now() / 1000) : Math.floor(ms / 1000);

    if (!ALWAYS_INCLUDE.has(feed.source) && !AI_KEYWORDS.test(title)) continue;

    const guid = textOf(item.guid) || textOf(item.id) || url;
    stories.push({
      id: `rss-${feed.source}-${guid}`.slice(0, 200),
      title,
      url,
      source: feed.source,
      domain: domainOf(url),
      createdAt,
    });
  }
  return stories;
}

async function fetchFeed(feed: Feed): Promise<Story[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "Mozilla/5.0 (portfolio-news-aggregator)" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`${feed.source} ${res.status}`);
  const xml = await res.text();
  return parseFeed(xml, feed).slice(0, 8); // cap per feed
}

export async function GET() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const stories: Story[] = [];
  const errors: string[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") stories.push(...r.value);
    else errors.push(`${FEEDS[i].source}: ${String(r.reason)}`);
  });

  stories.sort((a, b) => b.createdAt - a.createdAt);

  return Response.json(
    { stories, sources: FEEDS.map((f) => f.source), errors },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    },
  );
}
