#!/usr/bin/env node
// learn-agent — an adaptive tutor that takes you from zero to your target level
// on ANY topic. Iteration 1: diagnose → assess → plan.
import { c, line, banner, rule, prompt, choose, spinnerStart, closeUI } from "./lib/ui.mjs";
import * as store from "./lib/store.mjs";
import { review as srsReview, dueCards } from "./lib/srs.mjs";
import {
  diagnosticQuestions,
  assessKnowledge,
  planCurriculum,
  teachModule,
  generateFlashcards,
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
    await teachNext(state, slug);
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
  line(c.faint(`\nNext: run  tutor learn "${topic}"  again to start your first lesson.`));
}

// Teach the next unlearned module + generate its flashcards.
async function teachNext(state, slug) {
  const level = state.diagnostic?.assessment?.level || "beginner";
  const next = state.curriculum.find((m) => m.status === "todo");

  banner(`learn-agent · ${state.topic}`, `target: ${state.targetLevel}`);

  if (!next) {
    const due = dueCards(state.flashcards).length;
    line(c.lime("🎉 You've been taught every module in your plan."));
    line(
      c.dim(
        due
          ? `${due} flashcard(s) due — run:  tutor review "${state.topic}"`
          : "No reviews due right now. (Assessments + mastery tracking land next build.)",
      ),
    );
    return;
  }

  const taught = state.curriculum.filter((m) => m.status !== "todo").length;
  rule(`lesson ${taught + 1}/${state.curriculum.length} · ${next.title}`);

  const stop = spinnerStart("preparing your lesson…");
  let lesson;
  try {
    lesson = await teachModule(state.topic, next, level);
  } finally {
    stop();
  }
  line("");
  line(lesson);
  line("");
  await prompt("Take a beat — answer the check question above (or Enter to continue):");

  const stop2 = spinnerStart("making flashcards to lock it in…");
  let cards;
  try {
    cards = await generateFlashcards(state.topic, next, level);
  } finally {
    stop2();
  }

  cards.forEach((card, i) => {
    state.flashcards.push({
      id: `${next.id}-${i}`,
      moduleId: next.id,
      front: card.front,
      back: card.back,
      ease: 2.5,
      intervalDays: 0,
      reps: 0,
      dueAt: null, // due immediately
    });
  });
  next.status = "learning";
  state.log.push({ at: new Date().toISOString(), event: "taught", module: next.id });
  store.save(slug, state);

  const due = dueCards(state.flashcards).length;
  line(c.lime(`✓ Lesson done.`) + c.dim(` Added ${cards.length} flashcards (${due} due).`));
  line(c.faint(`\n  tutor review "${state.topic}"   — lock it in with spaced repetition`));
  line(c.faint(`  tutor learn "${state.topic}"    — next lesson`));
}

// Spaced-repetition review of due flashcards.
async function cmdReview(topicArg) {
  let topic = topicArg;
  if (!topic) {
    const topics = store.listTopics();
    if (topics.length === 1) topic = topics[0].topic;
    else {
      line(c.amber('Which topic? e.g.  tutor review "vector databases"'));
      return;
    }
  }
  const slug = store.slugify(topic);
  const state = store.load(slug);
  if (!state) {
    line(c.amber(`No saved topic "${topic}". Start with: tutor learn "${topic}"`));
    return;
  }

  const now = Date.now();
  const due = dueCards(state.flashcards, now);
  banner(`learn-agent · ${state.topic}`, "spaced-repetition review");

  if (!due.length) {
    const upcoming = state.flashcards
      .map((c2) => c2.dueAt)
      .filter(Boolean)
      .sort()[0];
    line(c.lime("Nothing due right now. 🌱"));
    if (upcoming) line(c.dim(`Next card due ${new Date(upcoming).toLocaleString()}.`));
    else if (!state.flashcards.length)
      line(c.dim(`No flashcards yet — run: tutor learn "${state.topic}"`));
    return;
  }

  line(c.dim(`${due.length} card(s) due. Recall, reveal, then rate yourself.\n`));
  const RATING = [
    { key: 1, label: "Again — blanked" },
    { key: 3, label: "Hard — got it, barely" },
    { key: 4, label: "Good — solid" },
    { key: 5, label: "Easy — instant" },
  ];

  let i = 0;
  for (const card of due) {
    i += 1;
    rule(`card ${i}/${due.length}`);
    line(`  ${c.bold(card.front)}`);
    await prompt("recall it… then Enter to reveal");
    line(`  ${c.mint("→ " + card.back)}\n`);
    const quality = await choose("How did it go?", RATING);
    Object.assign(card, srsReview(card, quality, now)); // mutates the array entry
    line(c.faint(`   next review in ${card.intervalDays} day(s)\n`));
  }

  store.save(slug, state);
  const left = dueCards(state.flashcards, now).length;
  line(c.lime(`✓ Reviewed ${due.length} card(s).`) + c.dim(left ? ` ${left} still due.` : " All caught up!"));
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
    const taught = (t.curriculum || []).filter((m) => m.status !== "todo").length;
    const total = (t.curriculum || []).length;
    const due = dueCards(t.flashcards || []).length;
    const dueTxt = due ? c.amber(` · ${due} due`) : "";
    line(
      `  ${c.lime("›")} ${c.bold(t.topic)} ${c.faint(`— ${t.targetLevel || "?"} · ${taught}/${total} taught`)}${dueTxt}`,
    );
  });
}

function help() {
  banner("learn-agent", "an adaptive tutor for any topic");
  line(`  ${c.lime("tutor learn")} ${c.dim('"<topic>"')}   diagnose, plan, then teach the next lesson`);
  line(`  ${c.lime("tutor review")} ${c.dim('"<topic>"')}  spaced-repetition review of due flashcards`);
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
    else if (cmd === "review") await cmdReview(arg);
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
