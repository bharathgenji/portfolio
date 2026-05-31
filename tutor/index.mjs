#!/usr/bin/env node
// learn-agent — an adaptive tutor that takes you from zero to your target level
// on ANY topic. Iteration 1: diagnose → assess → plan.
import { c, line, banner, rule, prompt, choose, spinnerStart, closeUI } from "./lib/ui.mjs";
import * as store from "./lib/store.mjs";
import {
  diagnosticQuestions,
  assessKnowledge,
  planCurriculum,
  TARGET_LEVELS,
} from "./lib/agents.mjs";

const PRIORITY_COLOR = { core: c.lime, review: c.faint, stretch: c.amber };

async function cmdLearn(topic) {
  if (!topic) {
    line(c.amber('Usage: tutor learn "the topic you want to learn"'));
    return;
  }
  const slug = store.slugify(topic);
  let state = store.load(slug) || store.newState(topic);

  if (state.diagnostic && state.curriculum.length) {
    banner(`learn-agent · ${state.topic}`, `target: ${state.targetLevel}`);
    line(c.dim("You've already been diagnosed. Here's your plan:\n"));
    printCurriculum(state.curriculum);
    line("");
    line(c.faint("Teaching + flashcards + assessments arrive in the next build."));
    return;
  }

  banner(`learn-agent · ${state.topic}`, "Let's find out where you're starting from.");
  rule("diagnostic");
  line(c.dim("Answer honestly — 'I don't know' is a perfectly good answer.\n"));

  let stop = spinnerStart("thinking up the right questions…");
  let questions;
  try {
    questions = await diagnosticQuestions(topic);
  } finally {
    stop();
  }

  const qa = [];
  for (const q of questions) {
    const answer = await prompt(q.question);
    qa.push({ question: q.question, answer });
    line("");
  }

  stop = spinnerStart("assessing what you know…");
  let assessment;
  try {
    assessment = await assessKnowledge(topic, qa);
  } finally {
    stop();
  }

  rule("where you stand");
  line(`  level: ${c.mint(assessment.level)}`);
  line(`  ${c.dim(assessment.summary)}`);
  if (assessment.known?.length) {
    line(`\n  ${c.lime("✓ already solid:")}`);
    assessment.known.forEach((k) => line(`    ${c.faint("·")} ${k}`));
  }
  if (assessment.gaps?.length) {
    line(`\n  ${c.amber("△ gaps to close:")}`);
    assessment.gaps.forEach((g) => line(`    ${c.faint("·")} ${g}`));
  }
  line("");

  rule("your goal");
  const target = await choose(
    "How far do you want to take this?",
    TARGET_LEVELS.map((t) => ({ key: t.key, label: t.label })),
  );
  line("");

  stop = spinnerStart("designing your personalized curriculum…");
  let curriculum;
  try {
    curriculum = await planCurriculum(topic, assessment, target);
  } finally {
    stop();
  }

  state.diagnostic = { answers: qa, assessment };
  state.targetLevel = target;
  state.curriculum = curriculum;
  state.log.push({ at: new Date().toISOString(), event: "planned", target });
  store.save(slug, state);

  rule(`curriculum → ${target}`);
  printCurriculum(curriculum);
  line("");
  const core = curriculum.filter((m) => m.priority === "core").length;
  const mins = curriculum.reduce((s, m) => s + (m.estMinutes || 0), 0);
  line(
    c.dim(
      `${curriculum.length} modules (${core} core) · ~${mins} min · saved to ~/.learn-agent/${slug}`,
    ),
  );
  line(c.faint("\nNext: run the same command again to start learning (coming next build)."));
}

function printCurriculum(modules) {
  modules.forEach((m, i) => {
    const tag = (PRIORITY_COLOR[m.priority] || c.dim)(`[${m.priority || "core"}]`);
    const n = c.faint(String(i + 1).padStart(2, "0"));
    const mins = m.estMinutes ? c.faint(` · ${m.estMinutes}m`) : "";
    line(`  ${n} ${c.bold(m.title)} ${tag}${mins}`);
    if (m.summary) line(`     ${c.dim(m.summary)}`);
  });
}

function cmdList() {
  const topics = store.listTopics();
  banner("learn-agent", "your topics");
  if (!topics.length) {
    line(c.faint('  none yet — start with:  tutor learn "quantum computing"'));
    return;
  }
  topics.forEach((t) => {
    const done = (t.curriculum || []).filter((m) => m.status === "mastered").length;
    const total = (t.curriculum || []).length;
    line(`  ${c.lime("›")} ${c.bold(t.topic)} ${c.faint(`— ${t.targetLevel || "?"} · ${done}/${total} mastered`)}`);
  });
}

function help() {
  banner("learn-agent", "an adaptive tutor for any topic");
  line(`  ${c.lime("tutor learn")} ${c.dim('"<topic>"')}   diagnose your level, set a goal, get a plan`);
  line(`  ${c.lime("tutor list")}              your topics & progress`);
  line(`  ${c.lime("tutor help")}              this`);
  line("");
  line(c.faint("  Needs GEMINI_API_KEY (free: https://aistudio.google.com/apikey)."));
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const arg = rest.join(" ").trim();
  try {
    if (cmd === "learn") await cmdLearn(arg);
    else if (cmd === "list") cmdList();
    else help();
  } catch (err) {
    line("");
    line(c.amber(`✗ ${err.message || err}`));
    process.exitCode = 1;
  } finally {
    closeUI();
  }
}

main();
