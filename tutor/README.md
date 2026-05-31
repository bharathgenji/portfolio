# learn-agent 🧠

An adaptive, multi-agent tutor that takes you from zero to your target level on
**any** topic — right in your terminal.

It diagnoses what you already know by asking the right questions, sets a goal
with you, builds a personalized curriculum, teaches it, and drills you with
spaced-repetition flashcards and graded mastery checks.

**Prefer a browser?** There's a hosted web version with the full loop
(diagnose → plan → teach → flashcards → graded mastery checks) at **/tutor** on
the portfolio — no install, progress saved in your browser. This CLI is the
terminal-native version with the same loop and on-disk persistence.

## Quick start

```bash
# 1. Get a free Gemini key (no credit card): https://aistudio.google.com/apikey
export GEMINI_API_KEY=...            # PowerShell: $env:GEMINI_API_KEY="..."

# 2. Learn anything
node tutor/index.mjs learn "quantum computing"
# or, from this repo:
npm run tutor -- learn "quantum computing"

node tutor/index.mjs list            # your topics & progress
```

State is saved per-topic in `~/.learn-agent/<topic>/state.json`, so your
progress and (soon) flashcard schedules persist across sessions.

## How it works

A small fleet of specialized agents, orchestrated by the CLI:

| Agent | Role |
| --- | --- |
| **Diagnostician** | Asks adaptive questions to gauge your current understanding |
| **Assessor** | Scores your level and pinpoints known concepts vs. gaps |
| **Curriculum Planner** | Designs an ordered path from where you are → your goal |
| **Tutor** | Teaches each module with analogies, examples, a check question |
| **Flashcards + SM-2** | Generates cards and schedules spaced review |
| **Examiner** | Quizzes you per module, grades your answers, tracks mastery |

## Config

- `GEMINI_API_KEY` — required (free tier).
- `TUTOR_MODEL` — optional, defaults to `gemini-2.5-flash-lite`.

The LLM provider lives in one file (`lib/provider.mjs`) — swap it to target
Claude or OpenAI without touching the rest.

## Commands

```bash
tutor learn "<topic>"     # diagnose & plan, then teach the next lesson each run
tutor review "<topic>"    # spaced-repetition review of due flashcards
tutor assess "<topic>"    # graded mastery check for the next module
tutor status "<topic>"    # progress toward your target level
tutor list                # topics & progress
```

## Roadmap

- [x] Diagnose → assess → personalized curriculum
- [x] Teach modules + auto-generated flashcards (SM-2 spaced repetition) + `review`
- [x] Per-module LLM-graded assessments, mastery tracking, `status` dashboard
- [ ] Portfolio `/learn` showcase page + tests
