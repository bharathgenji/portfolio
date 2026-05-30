import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Portfolio — page & content", () => {
  test("loads with correct title and meta", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Bharath Genji Mohanaranga/);
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute("content", /AI Engineer/);
  });

  test("hero shows name, role and summary", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Bharath Genji Mohanaranga/ }),
    ).toBeVisible();
    await expect(page.getByText(/ships production multi-agent systems/i).first()).toBeVisible();
  });

  test("impact stats are visible", async ({ page }) => {
    await page.goto("/");
    for (const stat of ["$2M+", "10K+", "4+ yrs"]) {
      await expect(page.getByText(stat, { exact: false }).first()).toBeVisible();
    }
  });

  test("all primary sections render", async ({ page }) => {
    await page.goto("/");
    for (const id of ["now", "work", "stack", "projects", "news"]) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    await expect(page.getByText("EMMA BPEM").first()).toBeVisible();
    await expect(page.getByText("Credit Risk Review Agent").first()).toBeVisible();
    await expect(page.getByText("TheDetail.ai").first()).toBeVisible();
    await expect(page.getByText("skills.json").first()).toBeVisible();
    await expect(page.getByText(/NCAA/).first()).toBeVisible();
  });

  test("navigation anchors jump to sections", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /work/i }).first().click();
    await expect(page).toHaveURL(/#work/);
    await expect(page.locator("#work")).toBeInViewport({ ratio: 0.05 });

    await page.getByRole("link", { name: /news/i }).first().click();
    await expect(page).toHaveURL(/#news/);
    await expect(page.locator("#news")).toBeInViewport({ ratio: 0.05 });
  });

  test("résumé PDF is served (200, pdf)", async ({ request }) => {
    const res = await request.get("/bharath-resume.pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("pdf");
  });

  test("contact links point to real profiles with safe rel", async ({ page }) => {
    await page.goto("/");
    const linkedin = page.getByRole("link", { name: /linkedin/i }).first();
    const github = page.getByRole("link", { name: /github/i }).first();
    await expect(linkedin).toHaveAttribute("href", /linkedin\.com\/in\/bharath-gm/);
    await expect(github).toHaveAttribute("href", /github\.com\/Bharath-GM/);
    // external links should open in a new tab safely
    for (const link of [linkedin, github]) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  });
});

test.describe("Portfolio — quality", () => {
  test("no console errors or uncaught exceptions on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    await page.goto("/", { waitUntil: "networkidle" });
    // give client effects a beat
    await page.waitForTimeout(1500);

    // Ignore benign favicon/network 404 noise; fail on real JS errors.
    const meaningful = errors.filter(
      (e) => !/favicon|net::ERR|Failed to load resource/i.test(e),
    );
    expect(meaningful, `Console errors:\n${meaningful.join("\n")}`).toEqual([]);
  });

  test("no horizontal overflow on desktop or mobile", async ({ page }) => {
    for (const size of [
      { width: 1280, height: 800 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("/");
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `viewport ${size.width}px`).toBeLessThanOrEqual(2);
    }
  });

  test("accessibility — no critical/serious axe violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    const summary = serious
      .map((v) => `${v.impact} · ${v.id} · ${v.nodes.length} node(s) · ${v.help}`)
      .join("\n");
    expect(serious, `Axe violations:\n${summary}`).toEqual([]);
  });

  test("visual snapshots (desktop + mobile)", async ({ page }) => {
    // Scroll-reveal animations fire on scroll, so walk the page to trigger them
    // before the full-page capture, otherwise sections render blank.
    const triggerReveals = async () => {
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.4;
        for (let y = 0; y <= document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 320));
        }
      });
      await page.waitForTimeout(600);
    };

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(2200); // let hero finish typing
    await triggerReveals();
    await page.screenshot({ path: "test-results/desktop-full.png", fullPage: true });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForTimeout(1500);
    await triggerReveals();
    await page.screenshot({ path: "test-results/mobile-full.png", fullPage: true });
  });
});
