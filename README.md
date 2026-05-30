# Bharath Genji Mohanaranga — Portfolio

A terminal-themed portfolio + **live AI/tech news feed**, built with Next.js and
deployed free on Vercel.

- **Live news** is pulled client-side from the [Algolia Hacker News API](https://hn.algolia.com/api)
  (no API key, no backend, free forever) and auto-refreshes every 90 seconds, so
  the feed stays current 24/7 with zero maintenance.
- **Fully static** output — costs nothing to host and loads instantly.

## Tech stack

| Layer       | Choice                                  |
| ----------- | --------------------------------------- |
| Framework   | Next.js 16 (App Router) + TypeScript    |
| Styling     | Tailwind CSS v4                         |
| Animation   | Motion (framer-motion)                  |
| Font        | JetBrains Mono                          |
| News source | Algolia Hacker News API (client-side)   |
| Hosting     | Vercel (free Hobby tier)                |

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Editing your content

Almost everything lives in **`src/lib/data.ts`** — your summary, current work,
job history, skills, projects, education, and contact links. Edit that one file
to update the site.

> ⚠️ **Before deploying, set your real links** in `src/lib/data.ts`:
> `profile.linkedin` and `profile.github` are currently placeholders.

Your résumé PDF is served from `public/bharath-resume.pdf` — replace that file to
update the download.

## The `/lab` playground (live document extraction)

The **`~/lab`** section runs a real Gemini agent that classifies a pasted
document and extracts structured fields + entities. It needs one env var:

```bash
# .env.local  (gitignored)
GEMINI_API_KEY=...   # free key, no card: https://aistudio.google.com/apikey
```

Without the key the playground still renders and shows a friendly "not
configured" message — everything else on the site works regardless.

On Vercel, add the same variable:

```bash
vercel env add GEMINI_API_KEY production   # paste the key when prompted
vercel --prod                              # redeploy to pick it up
```

(or add it under **Project → Settings → Environment Variables** in the dashboard.)

## Deploy to Vercel (free)

### Option A — GitHub + Vercel dashboard (recommended, auto-deploys on push)

1. Create a new repo on GitHub (e.g. `bharath-portfolio`).
2. Push this project:
   ```bash
   git add .
   git commit -m "Portfolio + live AI news"
   git branch -M main
   git remote add origin https://github.com/<you>/bharath-portfolio.git
   git push -u origin main
   ```
3. Go to [vercel.com/new](https://vercel.com/new), import the repo, and click
   **Deploy**. Vercel auto-detects Next.js — no config needed.
4. Every `git push` now redeploys automatically.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

You'll get a free `*.vercel.app` URL. Add a custom domain later in the Vercel
dashboard if you want (the `.vercel.app` URL is free and permanent).

## How the live news works

`src/lib/hn.ts` queries the Algolia HN search endpoint for several AI/tech terms
(`AI`, `LLM`, `GPT`, `machine learning`, `agents`), merges + dedupes the results,
and sorts newest-first. `src/components/NewsFeed.tsx` fetches on mount and on a
90-second interval, with loading/error/offline states and a manual refresh.

Because it reads the live Hacker News index directly from the browser, there's
nothing to keep running — it's always up to date whenever anyone visits.
