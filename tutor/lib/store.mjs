// Per-topic state persistence in ~/.learn-agent/<slug>/state.json
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = path.join(os.homedir(), ".learn-agent");

export function slugify(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function dir(slug) {
  return path.join(ROOT, slug);
}
function file(slug) {
  return path.join(dir(slug), "state.json");
}

export function load(slug) {
  try {
    return JSON.parse(fs.readFileSync(file(slug), "utf8"));
  } catch {
    return null;
  }
}

export function save(slug, state) {
  fs.mkdirSync(dir(slug), { recursive: true });
  fs.writeFileSync(file(slug), JSON.stringify(state, null, 2));
}

export function newState(topic) {
  return {
    topic,
    slug: slugify(topic),
    createdAt: new Date().toISOString(),
    targetLevel: null,
    diagnostic: null, // { answers, assessment }
    curriculum: [], // [{ id, title, summary, why, priority, status, mastery }]
    flashcards: [], // [{ id, moduleId, front, back, ease, intervalDays, dueAt, reps }]
    assessments: [],
    log: [],
  };
}

export function listTopics() {
  try {
    return fs
      .readdirSync(ROOT)
      .filter((d) => fs.existsSync(file(d)))
      .map((d) => load(d))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export { ROOT };
