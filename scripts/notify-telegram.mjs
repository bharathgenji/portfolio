// Sends the freshly-drafted Playbook post to Telegram with Approve/Reject
// buttons. Run by the playbook GitHub Action. Zero dependencies (uses fetch +
// a tiny frontmatter parse) so it works without `npm install` in CI.
import fs from "node:fs";

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SLUG } = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.");
  process.exit(1);
}
if (!SLUG) {
  console.error("Missing SLUG.");
  process.exit(1);
}

const path = `content/playbook/${SLUG}.md`;
const raw = fs.readFileSync(path, "utf8");

function frontmatter(md, key) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return "";
  const line = m[1].split("\n").find((l) => l.startsWith(`${key}:`));
  if (!line) return "";
  return line
    .slice(key.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const title = frontmatter(raw, "title") || SLUG;
const summary = frontmatter(raw, "summary") || "";

const text =
  `📝 New Playbook draft\n\n` +
  `${title}\n` +
  `${summary}\n\n` +
  `Approve to publish it to your site, or reject to discard.`;

const res = await fetch(
  `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve & publish", callback_data: `pub:${SLUG}` },
            { text: "❌ Reject", callback_data: `rej:${SLUG}` },
          ],
        ],
      },
    }),
  },
);

const json = await res.json();
if (!json.ok) {
  console.error("Telegram error:", JSON.stringify(json));
  process.exit(1);
}
console.log("Sent approval request for:", SLUG);
