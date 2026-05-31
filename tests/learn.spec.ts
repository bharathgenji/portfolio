import { test, expect } from "@playwright/test";

test.describe("Tutor showcase (/learn)", () => {
  test("page renders with key sections", async ({ page }) => {
    await page.goto("/learn");
    await expect(
      page.getByRole("heading", { level: 1, name: /learn-?agent/i }),
    ).toBeVisible();
    await expect(page.getByText(/six specialized agents/i)).toBeVisible();
    await expect(page.getByText(/Diagnostician/).first()).toBeVisible();
    // run instructions + source link
    await expect(page.locator(".post code").first()).toBeVisible();
    const src = page.getByRole("link", { name: /^❮❯ source$/i }).first();
    await expect(src).toHaveAttribute("href", /github\.com\/.*\/portfolio\/tree\/main\/tutor/);
    // and the live launch link
    await expect(page.getByRole("link", { name: /try it live/i }).first()).toHaveAttribute(
      "href",
      /\/tutor$/,
    );
  });

  test("homepage teaser links to /learn", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#tutor");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByText(/learn-agent/i).first()).toBeVisible();
    await section.getByRole("link", { name: /how it works/i }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });
});
