import { test, expect } from "@playwright/test";

test.describe("Live news feed", () => {
  test("loads stories from the live sources", async ({ page }) => {
    await page.goto("/");
    await page.locator("#news").scrollIntoViewIfNeeded();
    const items = page.getByTestId("news-item");
    // HN + RSS should yield plenty; wait for the feed to populate.
    await expect(items.first()).toBeVisible({ timeout: 30_000 });
    expect(await items.count()).toBeGreaterThan(5);
  });

  test("shows LIVE indicator once loaded", async ({ page }) => {
    await page.goto("/");
    await page.locator("#news").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("news-live")).toBeVisible({ timeout: 30_000 });
  });

  test("each story has a valid external link", async ({ page }) => {
    await page.goto("/");
    await page.locator("#news").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("news-item").first()).toBeVisible({ timeout: 30_000 });
    const firstLink = page.getByTestId("news-item-link").first();
    await expect(firstLink).toHaveAttribute("href", /^https?:\/\//);
    await expect(firstLink).toHaveAttribute("target", "_blank");
    await expect(firstLink).toHaveAttribute("rel", /noopener/);
  });

  test("displays multiple distinct sources (HN + RSS merged)", async ({ page }) => {
    await page.goto("/");
    await page.locator("#news").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("news-item").first()).toBeVisible({ timeout: 30_000 });

    const badges = await page
      .getByTestId("news-item")
      .locator("span", { hasText: /Hacker News|TechCrunch|The Verge|Ars Technica|VentureBeat/ })
      .allTextContents();
    const distinct = new Set(badges.map((b) => b.trim()));
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  test("refresh button keeps the feed populated", async ({ page }) => {
    await page.goto("/");
    await page.locator("#news").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("news-item").first()).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("news-refresh").click();
    await expect(page.getByTestId("news-item").first()).toBeVisible({ timeout: 30_000 });
    expect(await page.getByTestId("news-item").count()).toBeGreaterThan(5);
  });
});

test.describe("RSS API route", () => {
  test("/api/news returns valid normalized JSON", async ({ request }) => {
    const res = await request.get("/api/news");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.stories)).toBeTruthy();
    expect(body.stories.length).toBeGreaterThan(0);

    for (const s of body.stories.slice(0, 5)) {
      expect(s.title, "title present").toBeTruthy();
      expect(s.url, "url present").toMatch(/^https?:\/\//);
      expect(s.source, "source present").toBeTruthy();
      expect(typeof s.createdAt, "createdAt is number").toBe("number");
      // titles must be entity-decoded
      expect(s.title).not.toMatch(/&#\d+;|&amp;|&quot;/);
    }
  });

  test("/api/news sets caching headers", async ({ request }) => {
    const res = await request.get("/api/news");
    expect(res.headers()["cache-control"]).toContain("s-maxage");
  });
});
