# Adept — Build Plan

**Adept** is a standalone AI-tutor web app (accounts, synced progress) that grows
out of the `learn-agent` work. It lives in **this same repo and Vercel project**,
under its own route group `/adept` with its own UI/branding, separate from the
portfolio.

- **Auth + DB:** Supabase (Postgres + Auth + Row-Level Security)
- **Sign-in:** Google OAuth + email/password
- **LLM:** Gemini (reuses the existing `/api/tutor` route) — swappable
- **Hosting:** same Vercel project; app served at `/adept/*`
- **State:** per-user, in Postgres (replaces the demo's localStorage)

---

## Architecture

```
bharathgenji/portfolio  (one repo, one Vercel project)
├── /                      → portfolio (unchanged)
├── /tutor                 → the free localStorage demo (unchanged)
└── /adept                 → ADEPT — the real app
    ├── /adept             landing / marketing page
    ├── /adept/login       sign in / sign up (Google + email)
    ├── /adept/auth/...     OAuth callback + sign-out
    ├── /adept/app         dashboard — your topics
    └── /adept/app/[slug]  a topic: diagnose → plan → teach → review → assess

Supabase
├── auth.users            (managed by Supabase Auth)
├── profiles              1:1 with users (display name, etc.)
├── topics                a learning topic + its curriculum/assessment (JSONB)
└── flashcards            SM-2 cards (table, for "due" queries across topics)
   └── Row-Level Security: every row scoped to auth.uid()

LLM calls: client → /api/tutor (server, Gemini key) — already built.
Data:      client → Supabase (supabase-js + RLS) for CRUD.
```

**Why this shape:** reuses everything we built (the `/api/tutor` agents, the
Gemini key on Vercel, the design system). The only genuinely new pieces are
**auth** and **a database** — both from one service (Supabase).

---

## Data model (Postgres)

```sql
-- profiles: 1:1 with auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- topics: one per thing a user is learning
create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  slug text not null,
  target_level text,
  assessment jsonb,          -- { level, summary, known[], gaps[] }
  curriculum jsonb default '[]', -- [{ id, title, summary, priority, status, mastery }]
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, slug)
);

-- flashcards: SM-2 schedule (separate table for due-across-topics queries)
create table flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  topic_id uuid not null references topics on delete cascade,
  module_id text,
  front text not null,
  back text not null,
  ease real default 2.5,
  interval_days int default 0,
  reps int default 0,
  due_at timestamptz,        -- null = due now
  created_at timestamptz default now()
);

-- RLS: users see only their own rows (same policy pattern on all three tables)
alter table topics enable row level security;
create policy "own topics" on topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (repeat for profiles + flashcards)
```

---

## What you need to sign up for (all free)

| Service | Why | Cost |
| --- | --- | --- |
| **Supabase** account + project | Auth + Postgres + RLS | Free tier |
| **Google Cloud** OAuth credentials | "Sign in with Google" | Free |
| Vercel · GitHub · Gemini key | already have ✅ | Free |

You'll hand me: Supabase **Project URL**, **anon key**, and (for server use) the
**service-role key**; plus the Google OAuth **client ID/secret** (pasted into
Supabase's Google provider — not into our code). I wire the rest.

---

## Phases

### Phase 0 — Signups & setup *(you, ~15 min)*
1. Create a **Supabase** project; copy Project URL + anon key + service-role key.
2. Create **Google OAuth** credentials; add Supabase's callback URL; paste
   client ID/secret into Supabase → Auth → Providers → Google.
3. Give me the keys → I add them to Vercel + `.env.local`.

### Phase 1 — Scaffolding & auth
- `@supabase/ssr` clients (browser + server) + session-refresh middleware.
- `/adept` route group with its **own layout + branding** (distinct from the portfolio).
- `/adept/login`: Google button + email/password form; `/adept/auth/callback`.
- Protected `/adept/app` shell; sign-out.
- ✅ Done when: you can sign up, sign in (Google + email), and sign out.

### Phase 2 — Database & persistence
- Run the SQL migration (tables + RLS) via Supabase.
- Typed data layer (`src/lib/adept/db.ts`): create/list/update topics + flashcards.
- ✅ Done when: data reads/writes per-user and is isolated by RLS.

### Phase 3 — The learning app
- Dashboard: list/create/resume topics, progress.
- Topic view: the full loop (diagnose → plan → teach → flashcards → assess →
  mastery) backed by Postgres; SM-2 `review` across topics; "reached goal".
- ✅ Done when: a real account can learn a topic end-to-end, synced across devices.

### Phase 4 — Polish & product
- Landing page (what Adept is, sign-up CTA), account/settings, delete account.
- Empty/loading/error states, mobile, a11y; Playwright tests; deploy.
- ✅ Done when: it feels like a finished product and the suite is green.

### Phase 5 — Future (optional)
- Billing (Stripe), transactional email (Resend), shareable decks, teams,
  a custom subdomain (e.g. `adept.<domain>`), analytics.

---

## Guardrails
- The portfolio and `/tutor` demo stay untouched and working.
- Service-role key is **server-only** (never shipped to the browser).
- RLS is the security backbone — every table denies cross-user access by default.
- The public LLM endpoint keeps its rate limits + input caps.
