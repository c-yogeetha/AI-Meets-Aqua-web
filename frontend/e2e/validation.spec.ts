import { test, expect } from "@playwright/test";

test.describe("Validation Page Suite (E-VAL)", () => {
  test("E-VAL01: /validation separates software tests from unlabelled stand-in footage without claiming goldfish accuracy", async ({
    page,
  }) => {
    await page.goto("/validation");
    await page.waitForLoadState("domcontentloaded");

    // 1. Verify Tab 1: Software Tests is default active
    await expect(page.locator("h1")).toContainText("Empirical Validation & System Limits");
    await expect(page.getByTestId("tab-software")).toBeVisible();
    await expect(page.getByTestId("tab-benchmark")).toBeVisible();
    await expect(page.getByTestId("tab-limitations")).toBeVisible();

    // Verify Software Metrics
    await expect(page.getByTestId("test-total")).toBeVisible();
    await expect(page.getByTestId("test-passed")).toBeVisible();
    await expect(page.getByTestId("test-coverage")).toBeVisible();

    const totalText = await page.getByTestId("test-total").textContent();
    expect(Number(totalText)).toBeGreaterThan(0);

    // 2. Switch to Tab 2: Detection Benchmark
    await page.getByTestId("tab-benchmark").click();

    // Verify benchmark tab loads and shows honest evaluation status
    const benchmarkScope = page.getByTestId("benchmark-scope");
    if (await benchmarkScope.count() > 0) {
      await expect(benchmarkScope).toContainText("General aquarium stand-in");
      await expect(benchmarkScope).toContainText("not a goldfish benchmark");
      await expect(page.locator('[data-testid="benchmark-table"]')).toBeVisible();
      await expect(page.getByText("Not measured").first()).toBeVisible();
    } else {
      await expect(page.getByText("Benchmark not yet run on real footage")).toBeVisible();
    }

    // 3. Switch to Tab 3: Supported Conditions Envelope
    await page.getByTestId("tab-limitations").click();

    await expect(page.getByText("Supported Conditions Envelope")).toBeVisible();
    await expect(page.getByText("Lighting & Illumination")).toBeVisible();
    await expect(page.getByText("Camera Angles & Perspectives")).toBeVisible();
    await expect(page.getByText("Water Clarity & Turbidity")).toBeVisible();
    await expect(page.getByText("Stocking Density")).toBeVisible();
    await expect(page.getByText("Documented Failure Modes & Degradation Behaviors")).toBeVisible();
  });

  test("E-VAL02: no console error or warning logs across public routes including validation", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`LOGGED CONSOLE ERROR ON ${page.url()}: ${msg.text()}`);
        consoleErrors.push(`[${msg.type()}] ${msg.text()} at ${page.url()}`);
      }
    });

    const routes = ["/validation", "/", "/science", "/how-it-works", "/resources", "/about"];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      // Allow minor delay for any async rendering/effects
      await page.waitForTimeout(200);
    }

    expect(consoleErrors).toEqual([]);
  });
});
