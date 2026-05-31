// LLM provider for the tutor. Defaults to Gemini 2.5 Flash (free tier) so anyone
// can run it. Swap this one file to target Claude/OpenAI instead.
import { GoogleGenAI } from "@google/genai";

// flash-lite has a separate, more generous free-tier quota — ideal for a CLI
// that makes several calls per session. Override with TUTOR_MODEL.
const MODEL = process.env.TUTOR_MODEL || "gemini-2.5-flash-lite";

let client = null;
function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key (no card) at " +
        "https://aistudio.google.com/apikey and run:\n" +
        "  export GEMINI_API_KEY=...   (PowerShell: $env:GEMINI_API_KEY=\"...\")",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

/** Structured call: returns a validated object matching `schema`. */
export async function askJSON({ system, user, schema, temperature = 0.4 }) {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: `${system}\n\n${user}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature,
      maxOutputTokens: 4096,
      // 2.5 Flash thinks by default and would starve the JSON budget.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return JSON.parse(res.text ?? "{}");
}

/** Freeform call: returns plain text (for teaching explanations). */
export async function askText({ system, user, temperature = 0.6 }) {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: `${system}\n\n${user}`,
    config: { temperature, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
  });
  return (res.text ?? "").trim();
}

export { MODEL };
