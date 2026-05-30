// Telegram webhook for approving/rejecting Playbook drafts.
// Set it as your bot's webhook (see docs/PLAYBOOK.md). On "Approve" it flips the
// post's frontmatter status draft→published via the GitHub API (auto-deploys);
// on "Reject" it deletes the draft file. All free.

export const maxDuration = 30;

const REPO = process.env.GITHUB_REPO || "bharathgenji/portfolio";
const BRANCH = process.env.GITHUB_BRANCH || "main";

type TgCallback = {
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number };
    message?: { message_id: number; chat?: { id: number } };
  };
};

const gh = (path: string) => `https://api.github.com/repos/${REPO}/${path}`;
const ghHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

async function tg(method: string, token: string, body: unknown) {
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const ghToken = process.env.GITHUB_PAT;

  if (!botToken || !ghToken) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  // Verify the request really came from Telegram for this bot.
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("forbidden", { status: 401 });
  }

  let update: TgCallback;
  try {
    update = (await req.json()) as TgCallback;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const cb = update.callback_query;
  if (!cb?.data || !cb.message) return Response.json({ ok: true }); // ignore non-button updates

  // Only the owner may approve/reject.
  const fromChat = String(cb.message.chat?.id ?? cb.from?.id ?? "");
  if (chatId && fromChat !== String(chatId)) {
    await tg("answerCallbackQuery", botToken, {
      callback_query_id: cb.id,
      text: "Not authorized.",
    });
    return Response.json({ ok: true });
  }

  const [action, ...rest] = cb.data.split(":");
  const slug = rest.join(":");
  const path = `content/playbook/${slug}.md`;
  const messageId = cb.message.message_id;

  try {
    // Fetch the file (need its sha to update/delete).
    const getRes = await fetch(gh(`contents/${path}?ref=${BRANCH}`), {
      headers: ghHeaders(ghToken),
    });
    if (!getRes.ok) throw new Error(`GitHub GET ${getRes.status}`);
    const file = (await getRes.json()) as { content: string; sha: string };

    let resultText: string;

    if (action === "pub") {
      const current = Buffer.from(file.content, "base64").toString("utf8");
      const updated = current.replace(/status:\s*["']?draft["']?/i, "status: published");
      const putRes = await fetch(gh(`contents/${path}`), {
        method: "PUT",
        headers: ghHeaders(ghToken),
        body: JSON.stringify({
          message: `playbook: publish ${slug}`,
          content: Buffer.from(updated, "utf8").toString("base64"),
          sha: file.sha,
          branch: BRANCH,
        }),
      });
      if (!putRes.ok) throw new Error(`GitHub PUT ${putRes.status}`);
      resultText = `✅ Published: ${slug}\nDeploying to your site now.`;
    } else if (action === "rej") {
      const delRes = await fetch(gh(`contents/${path}`), {
        method: "DELETE",
        headers: ghHeaders(ghToken),
        body: JSON.stringify({
          message: `playbook: reject ${slug}`,
          sha: file.sha,
          branch: BRANCH,
        }),
      });
      if (!delRes.ok) throw new Error(`GitHub DELETE ${delRes.status}`);
      resultText = `❌ Rejected & deleted: ${slug}`;
    } else {
      resultText = "Unknown action.";
    }

    await tg("answerCallbackQuery", botToken, { callback_query_id: cb.id });
    await tg("editMessageText", botToken, {
      chat_id: fromChat,
      message_id: messageId,
      text: resultText,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    await tg("answerCallbackQuery", botToken, {
      callback_query_id: cb.id,
      text: `Failed: ${msg}`,
      show_alert: true,
    });
  }

  return Response.json({ ok: true });
}
