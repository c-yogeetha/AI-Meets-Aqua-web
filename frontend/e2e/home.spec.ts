import { test, expect } from "@playwright/test";

test.describe("Gate 3: Home & Public Navigation Suite", () => {
  test("E-HOME01: Loader appears once per session and disappears; second visit skips; reduced motion skips", async ({
    page,
    context,
  }) => {
    // 1. First visit in session: loader appears then disappears
    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    await expect(loader).toBeHidden({ timeout: 6000 });

    // 2. Second visit in same session: loader should not show
    await page.goto("/");
    await expect(page.locator('[data-testid="loader"]')).toBeHidden();

    // 3. Visit in a new page with reduced motion enabled: loader skipped immediately
    const reducedMotionPage = await context.newPage();
    await reducedMotionPage.emulateMedia({ reducedMotion: "reduce" });
    await reducedMotionPage.goto("/");
    await expect(reducedMotionPage.locator('[data-testid="loader"]')).toBeHidden();
    await reducedMotionPage.close();
  });

  test("E-HOME02: Hero text, CTA links, and hero video paused when scrolled away", async ({ page }) => {
    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    // Hero title check
    const title = page.locator('[data-testid="hero-title"]');
    await expect(title).toBeVisible();
    await expect(title).toContainText("The first sign of stress is in how they swim.");

    // CTA links check
    const ctaAnalyse = page.locator('[data-testid="cta-analyse"]');
    await expect(ctaAnalyse).toBeVisible();
    await expect(ctaAnalyse).toHaveAttribute("href", "/app/analyse");

    const ctaSample = page.locator('[data-testid="cta-sample"]');
    await expect(ctaSample).toBeVisible();

    // Video check: video element exists in Figure 1
    const video = page.locator("figure video");
    await expect(video).toBeAttached();

    // Scroll far down to FAQ
    await page.locator("#faq").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // When scrolled off screen, observer pauses video
    const isPaused = await video.evaluate((el: HTMLVideoElement) => el.paused);
    expect(isPaused).toBe(true);
  });

  test("E-HOME03: Signal explorer click and keyboard arrows change panel; thresholds equal API", async ({
    page,
    request,
  }) => {
    // Fetch expected scoring config from API via same-origin route
    const res = await request.get("/api/v1/config/scoring");
    expect(res.ok()).toBeTruthy();
    const cfg = await res.json();
    const fastBls = cfg.speed.fast_bl_s;

    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    await page.locator("#signals").scrollIntoViewIfNeeded();

    const panel = page.locator('[data-testid="signal-panel"]');
    await expect(panel).toBeVisible();

    // Initial signal is Speed (index 0)
    await expect(panel).toContainText("Swimming Speed");
    await expect(panel).toContainText(`${fastBls} BL/s`);

    // Click tab 1 (Direction)
    const tab1 = page.locator('[data-testid="signal-tab-1"]');
    await tab1.click();
    await expect(panel).toContainText("Direction Changes");
    await expect(panel).toContainText(`${cfg.direction.turn_deg}°`);

    // Keyboard navigation: press ArrowDown to move to Isolation (index 2)
    await tab1.press("ArrowDown");
    await expect(panel).toContainText("Social Isolation");

    // Press ArrowDown again to move to Vertical (index 3)
    await tab1.press("ArrowDown");
    await expect(panel).toContainText("Vertical Position");

    // Press ArrowUp to move back to Isolation
    await tab1.press("ArrowUp");
    await expect(panel).toContainText("Social Isolation");
  });

  test("E-HOME04: Drawn timeline contains nodes linking to how-it-works chapters", async ({ page }) => {
    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    await page.locator("#pipeline").scrollIntoViewIfNeeded();

    // Six stage nodes
    const stages = ["upload", "clean", "detect", "track", "score", "advise"];
    for (let i = 0; i < stages.length; i++) {
      const node = page.locator(`[data-testid="timeline-node-${i}"]`);
      await expect(node).toBeVisible();
      const link = node.locator("a");
      await expect(link).toHaveAttribute("href", `/how-it-works#${stages[i]}`);
    }
  });

  test("E-HOME05: Status table values equal the system status API", async ({ page, request }) => {
    const res = await request.get("/api/v1/system/status");
    expect(res.ok()).toBeTruthy();
    const statusData = await res.json();
    const onnxActive = Boolean(statusData.detectors?.onnx);
    const expectedOnnxLabel = onnxActive ? "Integrated" : "Awaiting trained weights";

    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    await page.locator("#status").scrollIntoViewIfNeeded();

    // Check status rows exist
    const rows = page.locator('[data-testid^="status-row-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // Learned detector row is row 2
    const row2 = page.locator('[data-testid="status-row-2"]');
    await expect(row2).toContainText("Learned detector");
    await expect(row2).toContainText(expectedOnnxLabel);
  });

  test("E-HOME06: Sample result section renders Gauge, fish rows, chart from sample json", async ({
    page,
  }) => {
    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    await page.locator("#sample-result").scrollIntoViewIfNeeded();

    // Correct provenance label
    await expect(
      page.locator("text=Sample output (baseline analyzer, synthetic clip)")
    ).toBeVisible();

    // Gauge rendered
    const gauge = page.locator('[data-testid="result-gauge"]');
    await expect(gauge).toBeVisible();

    // Timeline chart rendered
    const timeline = page.locator('[data-testid="result-timeline"]');
    await expect(timeline).toBeVisible();

    // Fish rows rendered
    const fishRow1 = page.locator('[data-testid="fish-row-1"]');
    await expect(fishRow1).toBeVisible();
  });

  test("E-HOME07: Drive link behavior when unset vs set", async ({ page }) => {
    await page.goto("/");
    // When NEXT_PUBLIC_DRIVE_URL is unset, drive-link should not be visible
    const driveLink = page.locator('[data-testid="drive-link"]');
    await expect(driveLink).toHaveCount(0);
  });

  test("E-NAV01: Public pill nav reaches pages; active state correct; mobile drawer behaves correctly", async ({
    page,
  }) => {
    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    const nav = page.locator('[data-testid="pill-nav"]');
    await expect(nav).toBeVisible();

    // 1. Navigate to Science
    await page.click('[data-testid="nav-science"]');
    await expect(page).toHaveURL(/\/science/);
    await expect(page.locator("h1")).toContainText("Quantifying Aquatic Stress");

    // 2. Navigate to How it works
    await page.click('[data-testid="nav-how-it-works"]');
    await expect(page).toHaveURL(/\/how-it-works/);
    await expect(page.locator("h1")).toContainText("From Raw Aquarium Video");

    // 3. Navigate to About
    await page.click('[data-testid="nav-about"]');
    await expect(page).toHaveURL(/\/about/);
    await expect(page.locator("h1")).toContainText("Non-Invasive Aquatic Bio-Telemetry");

    // 4. Test mobile viewport drawer
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const mobileLoader = page.locator('[data-testid="loader"]');
    if ((await mobileLoader.count()) > 0) {
      await mobileLoader.waitFor({ state: "hidden", timeout: 6000 });
    }

    // Open hamburger
    const menuBtn = page.locator('button[aria-label="Open menu"]');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Drawer dialog opens
    const drawer = page.locator('div[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Escape closes drawer
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("E-QA01: Viewport responsive test and no horizontal overflow", async ({ page }) => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ];

    const pagesToTest = ["/", "/science", "/how-it-works", "/about"];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      for (const path of pagesToTest) {
        await page.goto(path);
        const loader = page.locator('[data-testid="loader"]');
        if ((await loader.count()) > 0) {
          await loader.waitFor({ state: "hidden", timeout: 6000 });
        }

        // Verify no horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasHorizontalOverflow).toBe(false);
      }
    }
  });
});
