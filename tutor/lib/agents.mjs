// The specialized agents: each is a focused, structured LLM call.
import { Type } from "@google/genai";
import { askJSON, askText } from "./provider.mjs";

export const TARGET_LEVELS = [
  { key: "curious", label: "Curious — I just want the gist and the big ideas" },
  { key: "conversant", label: "Conversant — I can hold a smart conversation about it" },
  { key: "practitioner", label: "Practitioner — I can actually do/build with it" },
  { key: "expert", label: "Expert — deep, can teach it and handle edge cases" },
];

// ── Diagnostician ───────────────────────────────────────────────────────────
const QUESTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          tests: { type: Type.STRING, description: "what understanding this probes" },
        },
        required: ["id", "question"],
      },
    },
  },
  required: ["questions"],
};

export async function diagnosticQuestions(topic) {
  const { questions } = await askJSON({
    system:
      "You are a sharp diagnostician. Produce 4 open-ended questions to gauge someone's CURRENT understanding of a topic, spanning easy → hard. They must reveal depth, not just yes/no. Avoid trivia; probe mental models and reasoning. Keep each question one sentence.",
    user: `Topic: "${topic}". Return 4 diagnostic questions.`,
    schema: QUESTIONS_SCHEMA,
    temperature: 0.5,
  });
  return questions ?? [];
}

// ── Knowledge assessment ─────────────────────────────────────────────────────
const ASSESS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    level: {
      type: Type.STRING,
      description: "one of: novice, beginner, intermediate, advanced",
    },
    summary: { type: Type.STRING, description: "2-3 sentences on where they stand" },
    known: { type: Type.ARRAY, items: { type: Type.STRING } },
    gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["level", "summary", "known", "gaps"],
};

export async function assessKnowledge(topic, qa) {
  const transcript = qa
    .map((x, i) => `Q${i + 1}: ${x.question}\nA${i + 1}: ${x.answer || "(no answer)"}`)
    .join("\n\n");
  return askJSON({
    system:
      "You assess a learner's current knowledge from their answers to diagnostic questions. Be fair but honest. 'I don't know' answers indicate gaps, not failure. Identify concretely what they already grasp (known) and what's missing (gaps). Pick a level: novice, beginner, intermediate, advanced.",
    user: `Topic: "${topic}".\n\n${transcript}\n\nAssess them.`,
    schema: ASSESS_SCHEMA,
    temperature: 0.3,
  });
}

// ── Curriculum planner ───────────────────────────────────────────────────────
const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "short kebab id" },
          title: { type: Type.STRING },
          summary: { type: Type.STRING, description: "one line: what you'll learn" },
          why: { type: Type.STRING, description: "why it matters for the goal" },
          priority: {
            type: Type.STRING,
            description: "core | review | stretch",
          },
          estMinutes: { type: Type.NUMBER },
        },
        required: ["id", "title", "summary", "priority"],
      },
    },
  },
  required: ["modules"],
};

export async function planCurriculum(topic, assessment, targetLevel) {
  const { modules } = await askJSON({
    system:
      "You are an expert curriculum designer. Build a focused, ordered learning path that takes the learner from their CURRENT level to their TARGET level — and no further. Respect prerequisites (order matters). Skip or mark as 'review' things they already know; mark must-learn essentials 'core'; mark optional depth 'stretch'. 6–10 modules. Be specific and concrete, not generic.",
    user: `Topic: "${topic}".
Current level: ${assessment.level}.
Already knows: ${(assessment.known || []).join("; ") || "little"}.
Gaps: ${(assessment.gaps || []).join("; ") || "unknown"}.
Target level: ${targetLevel}.

Design the curriculum.`,
    schema: PLAN_SCHEMA,
    temperature: 0.4,
  });
  return (modules ?? []).map((m) => ({
    ...m,
    status: m.priority === "review" ? "known" : "todo",
    mastery: m.priority === "review" ? 0.6 : 0,
  }));
}

// ── Tutor (teaching) — used in iteration 2, included now ─────────────────────
export async function teachModule(topic, module, level) {
  return askText({
    system:
      "You are an exceptional tutor. Teach ONE concept clearly to a learner at the given level. Use a strong analogy, a concrete example, and end with one 'check yourself' question. Be vivid and concise (~250 words). Plain text with short paragraphs; no markdown headers.",
    user: `Topic: "${topic}". Learner level: ${level}. Teach this module:\nTitle: ${module.title}\nFocus: ${module.summary}`,
    temperature: 0.6,
  });
}
