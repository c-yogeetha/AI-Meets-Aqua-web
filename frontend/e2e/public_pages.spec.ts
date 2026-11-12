import { test, expect } from "@playwright/test";

test.describe("Public Pages & Redirects Suite (E-SCI, E-HOW, E-ABT, E-NAV03)", () => {
  test("E-SCI01: /science shows rules table from API, anchors work, and formulas visible", async ({
    page,
    request,
  }) => {
    const res = await request.get("/api/v1/config/scoring");
    expect(res.ok()).toBeTruthy();
    const cfg = await res.json();
    const fastBls = cfg.speed.fast_bl_s;

    await page.goto("/science");
    await page.waitForLoadState("domcontentloaded");

    // Title visible
    await expect(page.locator("h1")).toContainText("Quantifying Aquatic Stress");

    // Rules table from API contains fast swimming threshold
    const table = page.locator("#scoring table");
    await expect(table).toBeVisible();
    await expect(table).toContainText(`${fastBls} BL/s`);

    // Formulas visible
    await expect(page.locator("text=v(t) = ||x(t) - x(t - Δt)||")).toBeVisible();
    await expect(page.locator("text=S_tank = min(100, max_i(S_i)")).toBeVisible();
    await expect(page.locator("text=FSI = max(0, 100 - mean(recent_tank_scores))")).toBeVisible();
  });

  test("E-HOW01: /how-it-works architecture diagram clicking nodes opens side panel; analyzer table shows active mode", async ({
    page,
    request,
  }) => {
    const res = await request.get("/api/v1/system/status");
    expect(res.ok()).toBeTruthy();
    const statusData = await res.json();
    const activeMode = statusData.mode || "baseline";

    await page.goto("/how-it-works");
    await page.waitForLoadState("domcontentloaded");

    // Subsystem topology section
    const archSection = page.locator("#architecture");
    await expect(archSection).toBeVisible();

    // Click API node
    const apiBtn = archSection.locator('button:has-text("REST API Service")');
    await expect(apiBtn).toBeVisible();
    await apiBtn.click();

    // Node detail panel shows backend/app/main.py
    await expect(archSection).toContainText("backend/app/main.py");
    await expect(archSection).toContainText("FastAPI, Python 3.12, Pydantic");

    // Analyzer modes table
    const modesTable = page.locator("#modes table");
    await expect(modesTable).toBeVisible();
    await expect(modesTable).toContainText("(ACTIVE MODE)");
    await expect(modesTable).toContainText(activeMode);
  });

  test("E-ABT01: /about shows team, institution, milestones with evidence links, and maturity table", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.waitForLoadState("domcontentloaded");

    // Team names
    const teamMembers = [
      "C Yogeetha",
      "Mamata",
      "Sambrama M",
      "Lakshmi Chandrashekara",
      "M Vijayalaxmi",
      "Ropashree D",
    ];
    for (const name of teamMembers) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }

    // Institution
    await expect(page.locator("text=Atria Institute of Technology").first()).toBeVisible();
    await expect(page.locator("text=Department of Computer Science & Engineering").first()).toBeVisible();

    // Milestones with evidence links
    const milestones = page.locator("text=Project Milestones").locator("..").locator("..");
    await expect(milestones).toBeVisible();
    await expect(page.locator('a:has-text("Review Literature")')).toBeVisible();

    // Implemented today vs planned table
    await expect(page.locator("text=Implemented Today vs. Planned")).toBeVisible();
  });

  test("E-NAV03: Legacy routes redirect permanently", async ({ page }) => {
    // 1. /analyse -> /app/analyse
    await page.goto("/analyse");
    await expect(page).toHaveURL(/\/app\/analyse/);

    // 2. /history -> /app/history
    await page.goto("/history");
    await expect(page).toHaveURL(/\/app\/history/);

    // 3. /tanks -> /app/tanks
    await page.goto("/tanks");
    await expect(page).toHaveURL(/\/app\/tanks/);

    // 4. /settings -> /app/settings
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/app\/settings/);

    // 5. /testing -> /validation
    await page.goto("/testing");
    await expect(page).toHaveURL(/\/validation/);
  });
});
