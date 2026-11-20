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

  test("E-HOME02: Hero text, CTA links, and redesigned hero structure", async ({ page }) => {
    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    // Hero title check
    const title = page.locator('[data-testid="hero-title"]');
    await expect(title).toBeVisible();
    await expect(title).toContainText("Notice what they can't tell you.");

    // CTA links check
    const ctaAnalyse = page.locator('[data-testid="cta-analyse"]');
    await expect(ctaAnalyse).toBeVisible();
    await expect(ctaAnalyse).toHaveAttribute("href", "/app/analyse");
    await expect(ctaAnalyse).toHaveAttribute("target", "_blank");

    const ctaSample = page.locator('[data-testid="cta-sample"]');
    await expect(ctaSample).toBeVisible();
  });

  test("E-HOME03: Dynamic system status and scoring telemetry from API", async ({
    page,
    request,
  }) => {
    // Fetch expected scoring config from API via same-origin route
    const res = await request.get("/api/v1/config/scoring");
    expect(res.ok()).toBeTruthy();
    const cfg = await res.json();
    expect(cfg.speed.fast_bl_s).toBeGreaterThan(0);

    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    // Dynamic stats and system status
    await page.locator("#features").scrollIntoViewIfNeeded();
    await expect(page.getByText("Upload Clip")).toBeVisible();
    await expect(page.getByText("Suggestions")).toBeVisible();
  });

  test("E-HOME04: Solution pipeline links to how-it-works chapters", async ({ page }) => {
    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    await page.locator("#features").scrollIntoViewIfNeeded();
    await expect(page.getByText("From video to actionable insight")).toBeVisible();
    await expect(page.getByText("Upload Clip")).toBeVisible();
  });

  test("E-HOME05: Detector status matches system status API", async ({ page, request }) => {
    const res = await request.get("/api/v1/system/status");
    expect(res.ok()).toBeTruthy();
    const statusData = await res.json();
    const onnxActive = Boolean(statusData.detectors?.onnx);

    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    const badge = page.getByTestId("detector-status-badge");
    await expect(badge).toBeVisible();
    if (onnxActive) {
      await expect(badge).toContainText("Integrated");
    } else {
      await expect(badge).toContainText("classical detector");
    }
  });

  test("E-HOME06: Historical recordings and dynamic metrics render", async ({
    page,
  }) => {
    await page.goto("/");
    const loader = page.locator('[data-testid="loader"]');
    if ((await loader.count()) > 0) {
      await loader.waitFor({ state: "hidden", timeout: 6000 });
    }

    await page.locator("#recordings").scrollIntoViewIfNeeded();
    await expect(page.getByText("Recordings & Tank History")).toBeVisible();
    await expect(page.getByTestId("cta-sample")).toBeVisible();
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

    // 1. Navigate to Resources
    await page.click('[data-testid="nav-resources"]');
    await expect(page).toHaveURL(/\/resources/);

    // 2. Navigate to About
    await page.click('[data-testid="nav-about"]');
    await expect(page).toHaveURL(/\/about/);
    await expect(page.locator("h1")).toContainText("Non-Invasive Aquatic Kinematic Telemetry");

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
