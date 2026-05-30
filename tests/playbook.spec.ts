import { test, expect } from "@playwright/test";

test.describe("Playbook", () => {
  test("index lists posts", async ({ page }) => {
    await page.goto("/playbook");
    await expect(
      page.getByRole("heading", { level: 1, name: /Playbook/ }),
    ).toBeVisible();
    const posts = page.locator('a[href^="/playbook/"]');
    expect(await posts.count()).toBeGreaterThanOrEqual(2);
  });

  test("a post renders its markdown content", async ({ page }) => {
    await page.goto("/playbook/give-your-agent-an-escape-hatch");
    await expect(
      page.getByRole("heading", { level: 1, name: /escape hatch/i }),
    ).toBeVisible();
    // markdown body rendered (an h2 + a code block exist)
    await expect(page.locator(".post h2").first()).toBeVisible();
    await expect(page.locator(".post code").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /all posts/i }).first()).toBeVisible();
  });

  test("homepage teaser links into the playbook", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#playbook");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByText(/Field notes/i)).toBeVisible();
    await section.getByRole("link", { name: /all posts/i }).click();
    await expect(page).toHaveURL(/\/playbook$/);
  });

  test("approval webhook responds gracefully (no 500)", async ({ request }) => {
    const res = await request.post("/api/playbook", {
      data: { callback_query: { id: "1", data: "pub:x", message: { message_id: 1, chat: { id: 1 } } } },
    });
    // 503 not_configured locally, 401 if a webhook secret is set, 200 once live.
    // The point: it handles the request deliberately rather than crashing (500/502).
    expect([200, 401, 503]).toContain(res.status());
  });
});
