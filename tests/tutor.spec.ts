import { test, expect } from "@playwright/test";

test.describe("Web tutor (/tutor)", () => {
  test("renders the intro with a topic input", async ({ page }) => {
    await page.goto("/tutor");
    await expect(page.getByRole("heading", { name: /Learn anything/i })).toBeVisible();
    await expect(page.getByPlaceholder(/transformers/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /begin/i })).toBeVisible();
  });

  test("homepage teaser launches the tutor", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#tutor");
    await section.scrollIntoViewIfNeeded();
    await section.getByRole("link", { name: /try it live/i }).click();
    await expect(page).toHaveURL(/\/tutor$/);
  });

  test("/api/tutor responds for diagnose", async ({ request }) => {
    const res = await request.post("/api/tutor", {
      data: { action: "diagnose", topic: "binary search" },
    });
    // 200 when GEMINI_API_KEY is set; 429/503/502 otherwise — never a crash.
    expect([200, 429, 502, 503]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.questions)).toBeTruthy();
    }
  });

  test("/api/tutor rejects empty topic / unknown action", async ({ request }) => {
    const res = await request.post("/api/tutor", { data: { action: "nope" } });
    expect([400, 429, 503]).toContain(res.status());
  });
});
