# The Playbook — autonomous writer + Telegram approval (stage 2)

This pipeline drafts a new Playbook post on a schedule using **Claude Code on your
Max subscription** (no API billing), pings you on **Telegram** with Approve/Reject
buttons, and publishes on approval. Everything below is free.

```
GitHub Action (cron)                Telegram                 Vercel webhook
  claude -p (your sub)  ──drafts──▶  ✅/❌ buttons  ──tap──▶  /api/playbook
        │                                                          │
        └── commits status:draft                 flips →published / deletes
                                                  via GitHub API → auto-deploy
```

## 1. Create the free credentials

**Telegram bot + chat id**
1. In Telegram, message **@BotFather** → `/newbot` → follow prompts → copy the **bot token**.
2. Send your new bot any message (e.g. "hi").
3. Get your **chat id**: open
   `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` in a browser and read
   `result[].message.chat.id` (or message **@userinfobot**).

**Claude subscription token** (on a machine logged into your Max plan)
```bash
claude setup-token        # prints a 1-year CLAUDE_CODE_OAUTH_TOKEN
```

**GitHub fine-grained PAT** (lets the webhook publish)
- github.com/settings/tokens → *Fine-grained tokens* → repo `bharathgenji/portfolio`
  only → Permissions → **Contents: Read and write** → generate → copy.

**A webhook secret** — any random string, e.g. `openssl rand -hex 16`.

## 2. Add the secrets

**GitHub repo → Settings → Secrets and variables → Actions:**
| Secret | Value |
| --- | --- |
| `CLAUDE_CODE_OAUTH_TOKEN` | from `claude setup-token` |
| `TELEGRAM_BOT_TOKEN` | from BotFather |
| `TELEGRAM_CHAT_ID` | your chat id |

**Vercel → Project → Settings → Environment Variables** (Production):
| Var | Value |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | from BotFather |
| `TELEGRAM_CHAT_ID` | your chat id |
| `TELEGRAM_WEBHOOK_SECRET` | the random string |
| `GITHUB_PAT` | the fine-grained PAT |
| `GITHUB_REPO` | `bharathgenji/portfolio` (optional; this is the default) |

Redeploy Vercel after adding env vars.

## 3. Register the Telegram webhook (one-time)

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://bharath-portfolio-inky.vercel.app/api/playbook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## 4. Run it

- **On demand:** GitHub → Actions → *Playbook draft* → **Run workflow**.
- **Scheduled:** Mondays 14:00 UTC (edit the cron in `.github/workflows/playbook.yml`).

You'll get a Telegram message with the draft + buttons. Tap **Approve** → the post
goes live in ~1 minute. Tap **Reject** → the draft is deleted.
