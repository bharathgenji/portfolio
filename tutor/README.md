# learn-agent 🧠

An adaptive, multi-agent tutor that takes you from zero to your target level on
**any** topic — right in your terminal.

It diagnoses what you already know by asking the right questions, sets a goal
with you, then builds a personalized curriculum. (Teaching, spaced-repetition
flashcards, and mastery assessments are landing iteratively — see roadmap.)

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
| **Tutor** | Teaches each module (roadmap) |
| **Flashcards + SM-2** | Generates cards and schedules spaced review (roadmap) |

## Config

- `GEMINI_API_KEY` — required (free tier).
- `TUTOR_MODEL` — optional, defaults to `gemini-2.5-flash-lite`.

The LLM provider lives in one file (`lib/provider.mjs`) — swap it to target
Claude or OpenAI without touching the rest.

## Roadmap

- [x] Diagnose → assess → personalized curriculum
- [ ] Teach modules + auto-generated flashcards (SM-2 spaced repetition)
- [ ] Per-module assessments, mastery tracking, adaptive re-planning
- [ ] `review` / `status` commands
