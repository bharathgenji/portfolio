import { test, expect } from "@playwright/test";

// These pass whether or not GEMINI_API_KEY is configured: with a key the real
// extraction renders; without one the UI shows a graceful "not configured"
// message. Both are valid, tested outcomes.

test.describe("Lab playground — UI", () => {
  test("renders input, samples and run button", async ({ page }) => {
    await page.goto("/");
    await page.locator("#lab").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("lab-input")).toBeVisible();
    await expect(page.getByTestId("lab-run")).toBeVisible();
    expect(await page.getByTestId("lab-sample").count()).toBeGreaterThanOrEqual(2);
  });

  test("loading a sample populates the input", async ({ page }) => {
    await page.goto("/");
    await page.locator("#lab").scrollIntoViewIfNeeded();
    await page.getByTestId("lab-sample").first().click();
    const val = await page.getByTestId("lab-input").inputValue();
    expect(val.length).toBeGreaterThan(50);
  });

  test("run button is disabled until there is input", async ({ page }) => {
    await page.goto("/");
    await page.locator("#lab").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("lab-run")).toBeDisabled();
    await page.getByTestId("lab-sample").first().click();
    await expect(page.getByTestId("lab-run")).toBeEnabled();
  });

  test("running yields a result or a graceful error", async ({ page }) => {
    await page.goto("/");
    await page.locator("#lab").scrollIntoViewIfNeeded();
    await page.getByTestId("lab-sample").first().click();
    await page.getByTestId("lab-run").click();
    const outcome = page.getByTestId("lab-result").or(page.getByTestId("lab-error"));
    await expect(outcome.first()).toBeVisible({ timeout: 35_000 });
  });
});

test.describe("Lab playground — API contract", () => {
  test("/api/extract validates and responds as JSON", async ({ request }) => {
    // empty body
    const empty = await request.post("/api/extract", { data: {} });
    // 400 (empty) when key is set, or 503 (not configured) otherwise
    expect([400, 503, 429]).toContain(empty.status());
    const body = await empty.json();
    expect(body).toHaveProperty("error");

    // a real document
    const res = await request.post("/api/extract", {
      data: { text: "Invoice #42 from ACME, total due $1,250 by 2026-06-01." },
    });
    expect([200, 503, 429]).toContain(res.status());
    const data = await res.json();
    if (res.status() === 200) {
      expect(data).toHaveProperty("documentType");
      expect(Array.isArray(data.fields)).toBeTruthy();
      expect(data.meta).toHaveProperty("model");
    } else {
      expect(data).toHaveProperty("error");
    }
  });
});
