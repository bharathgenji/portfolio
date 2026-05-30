import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 30;

const MAX_INPUT = 6000; // chars — keeps latency + token use sane on the free tier
const MODEL = "gemini-2.5-flash";

// Best-effort in-memory rate limit (per warm instance). The Gemini free tier
// caps cost at zero regardless; this just keeps a single user from spamming.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: {
      type: Type.STRING,
      description: "Concise label, e.g. 'Invoice', 'Resume', 'Contract', 'Email'",
    },
    summary: { type: Type.STRING, description: "One-sentence summary" },
    entities: {
      type: Type.ARRAY,
      description: "Named entities found (people, orgs, dates, money, locations)",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          value: { type: Type.STRING },
        },
        required: ["type", "value"],
      },
    },
    fields: {
      type: Type.ARRAY,
      description: "Key structured fields extracted from the document",
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          value: { type: Type.STRING },
          confidence: { type: Type.NUMBER, description: "0.0–1.0" },
        },
        required: ["key", "value", "confidence"],
      },
    },
    steps: {
      type: Type.ARRAY,
      description: "Short past-tense notes on the reasoning steps you took",
      items: { type: Type.STRING },
    },
    overallConfidence: { type: Type.NUMBER, description: "0.0–1.0" },
  },
  required: ["documentType", "summary", "entities", "fields", "steps", "overallConfidence"],
};

const SYSTEM = `You are a document-intelligence extraction agent. Given raw document text, identify the document type, extract the most important structured fields and named entities, and assess your confidence. Be precise; if a value is uncertain, lower its confidence. Keep "steps" to 3–5 short past-tense phrases describing what you did (e.g. "Classified document as invoice", "Located vendor + totals", "Validated dates"). Return ONLY the structured object.`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: "not_configured",
        message:
          "The playground needs a GEMINI_API_KEY environment variable. Get a free key at aistudio.google.com/apikey.",
      },
      { status: 503 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "rate_limited", message: "Slow down a moment — try again shortly." },
      { status: 429 },
    );
  }

  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    return Response.json({ error: "bad_request", message: "Invalid JSON body." }, { status: 400 });
  }

  if (!text) {
    return Response.json(
      { error: "empty", message: "Paste some document text to extract." },
      { status: 400 },
    );
  }
  const truncated = text.length > MAX_INPUT;
  const input = truncated ? text.slice(0, MAX_INPUT) : text;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const started = Date.now();
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `${SYSTEM}\n\n--- DOCUMENT ---\n${input}`,
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
        maxOutputTokens: 1200,
      },
    });
    const latencyMs = Date.now() - started;

    const raw = res.text ?? "{}";
    const data = JSON.parse(raw);

    return Response.json({
      ...data,
      meta: {
        model: MODEL,
        latencyMs,
        tokens: res.usageMetadata?.totalTokenCount ?? null,
        truncated,
        inputChars: input.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed.";
    // Surface quota/key errors distinctly so the UI can be helpful.
    const isQuota = /quota|rate|429|RESOURCE_EXHAUSTED/i.test(message);
    return Response.json(
      {
        error: isQuota ? "quota" : "upstream",
        message: isQuota
          ? "Gemini free-tier limit hit — give it a minute and retry."
          : "The model call failed. Check the API key / try again.",
      },
      { status: isQuota ? 429 : 502 },
    );
  }
}
