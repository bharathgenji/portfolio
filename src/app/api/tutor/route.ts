import { GoogleGenAI, Type } from "@google/genai";

export const maxDuration = 30;

const MODEL = "gemini-2.5-flash-lite";
const MAX_TEXT = 4000;

// Best-effort per-instance rate limit (free tier caps cost at zero anyway).
const hits = new Map<string, number[]>();
function rateLimited(ip: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

function clip(s: unknown): string {
  return String(s ?? "").slice(0, MAX_TEXT);
}

// ── schemas ──────────────────────────────────────────────────────────────────
const QUESTIONS = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { id: { type: Type.STRING }, question: { type: Type.STRING } },
        required: ["id", "question"],
      },
    },
  },
  required: ["questions"],
};

const ASSESS = {
  type: Type.OBJECT,
  properties: {
    level: { type: Type.STRING, description: "novice | beginner | intermediate | advanced" },
    summary: { type: Type.STRING },
    known: { type: Type.ARRAY, items: { type: Type.STRING } },
    gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["level", "summary", "known", "gaps"],
};

const PLAN = {
  type: Type.OBJECT,
  properties: {
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          priority: { type: Type.STRING, description: "core | review | stretch" },
          estMinutes: { type: Type.NUMBER },
        },
        required: ["id", "title", "summary", "priority"],
      },
    },
  },
  required: ["modules"],
};

const FLASHCARDS = {
  type: Type.OBJECT,
  properties: {
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { front: { type: Type.STRING }, back: { type: Type.STRING } },
        required: ["front", "back"],
      },
    },
  },
  required: ["cards"],
};

const GRADE = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER },
    summary: { type: Type.STRING },
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          verdict: { type: Type.STRING, description: "correct | partial | incorrect" },
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
        },
        required: ["verdict", "score", "feedback"],
      },
    },
  },
  required: ["overallScore", "summary", "results"],
};

type Body = {
  action?: string;
  topic?: string;
  qa?: { question: string; answer: string }[];
  assessment?: { level?: string; known?: string[]; gaps?: string[] };
  target?: string;
  module?: { title?: string; summary?: string };
  level?: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "not_configured", message: "Set GEMINI_API_KEY to enable the tutor." },
      { status: 503 },
    );
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "rate_limited", message: "Easy there — give it a few seconds." },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const askJSON = async (system: string, user: string, schema: object, temperature = 0.4) => {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `${system}\n\n${user}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return JSON.parse(res.text ?? "{}");
  };
  const askText = async (system: string, user: string) => {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: `${system}\n\n${user}`,
      config: { temperature: 0.6, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
    });
    return (res.text ?? "").trim();
  };

  const topic = clip(body.topic);
  const level = clip(body.level) || "beginner";
  const transcript = (body.qa ?? [])
    .slice(0, 8)
    .map((x, i) => `Q${i + 1}: ${clip(x.question)}\nA${i + 1}: ${clip(x.answer) || "(no answer)"}`)
    .join("\n\n");

  try {
    switch (body.action) {
      case "diagnose": {
        if (!topic) return Response.json({ error: "empty", message: "Enter a topic." }, { status: 400 });
        const out = await askJSON(
          "You are a sharp diagnostician. Produce 4 open-ended questions to gauge someone's CURRENT understanding of a topic, spanning easy → hard. Reveal depth, not trivia. One sentence each.",
          `Topic: "${topic}". Return 4 diagnostic questions.`,
          QUESTIONS,
          0.5,
        );
        return Response.json(out);
      }
      case "assess": {
        const out = await askJSON(
          "You assess a learner's knowledge from their diagnostic answers. Be fair; 'I don't know' is a gap, not failure. List what they grasp (known) and what's missing (gaps). Pick a level: novice, beginner, intermediate, advanced.",
          `Topic: "${topic}".\n\n${transcript}\n\nAssess them.`,
          ASSESS,
          0.3,
        );
        return Response.json(out);
      }
      case "plan": {
        const a = body.assessment ?? {};
        const out = await askJSON(
          "You are an expert curriculum designer. Build a focused, ordered path from the learner's CURRENT level to their TARGET — no further. Respect prerequisites. Mark already-known items 'review', essentials 'core', optional depth 'stretch'. 6–10 modules. Specific, not generic.",
          `Topic: "${topic}". Current level: ${clip(a.level)}. Knows: ${(a.known ?? []).join("; ") || "little"}. Gaps: ${(a.gaps ?? []).join("; ") || "unknown"}. Target level: ${clip(body.target)}. Design the curriculum.`,
          PLAN,
          0.4,
        );
        return Response.json(out);
      }
      case "teach": {
        const text = await askText(
          "You are an exceptional tutor. Teach ONE concept clearly at the learner's level: a strong analogy, a concrete example, and end with one 'check yourself' question. ~250 words, short paragraphs, no markdown headers.",
          `Topic: "${topic}". Learner level: ${level}. Module: "${clip(body.module?.title)}" — ${clip(body.module?.summary)}.`,
        );
        return Response.json({ text });
      }
      case "flashcards": {
        const out = await askJSON(
          "You create spaced-repetition flashcards. Each tests ONE idea: a clear question (front), a concise correct answer (back). Favor understanding over rote. Avoid yes/no. 4–6 cards.",
          `Topic: "${topic}". Learner level: ${level}. Module: "${clip(body.module?.title)}" — ${clip(body.module?.summary)}.`,
          FLASHCARDS,
        );
        return Response.json(out);
      }
      case "exam": {
        const out = await askJSON(
          "You write a short mastery check for ONE module. 4 open-ended questions that test real understanding and application (not trivia recall), ordered easy → hard. One sentence each.",
          `Topic: "${topic}". Learner level: ${level}. Module: "${clip(body.module?.title)}" — ${clip(body.module?.summary)}.`,
          QUESTIONS,
          0.4,
        );
        return Response.json(out);
      }
      case "grade": {
        const out = await askJSON(
          "You grade answers to a module mastery check. Be fair, award partial credit. Per answer: verdict (correct/partial/incorrect), 0–1 score, short feedback that teaches. Then overallScore (average) + one-line summary. 'No answer' scores 0.",
          `Topic: "${topic}". Module: "${clip(body.module?.title)}".\n\n${transcript}\n\nGrade it.`,
          GRADE,
          0.2,
        );
        return Response.json(out);
      }
      default:
        return Response.json({ error: "unknown_action" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    const quota = /quota|rate|429|RESOURCE_EXHAUSTED/i.test(msg);
    return Response.json(
      {
        error: quota ? "quota" : "upstream",
        message: quota
          ? "Gemini free-tier limit hit — give it a minute and retry."
          : "The model call failed — try again.",
      },
      { status: quota ? 429 : 502 },
    );
  }
}
