import { test, expect } from "@playwright/test";

test.describe("Validation Page Suite (E-VAL)", () => {
  test("E-VAL01: /validation tabs separate software tests from detection benchmark; missing benchmark file shows honest empty state without fabricated numbers", async ({
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

    // In the absence of real footage benchmarks, honest empty state is shown
    await expect(
      page.getByText("Benchmark not yet run on real footage")
    ).toBeVisible();
    await expect(
      page.getByText("Matsya adheres strictly to honest reporting principles")
    ).toBeVisible();

    // Ensure no benchmark table or invented accuracy appears in honest state
    await expect(page.locator('[data-testid="benchmark-table"]')).not.toBeVisible();

    // 3. Switch to Tab 3: Supported Conditions Envelope
    await page.getByTestId("tab-limitations").click();

    await expect(page.getByText("Supported Conditions Envelope")).toBeVisible();
    await expect(page.getByText("Lighting & Illumination")).toBeVisible();
    await expect(page.getByText("Camera Angles & Perspectives")).toBeVisible();
    await expect(page.getByText("Water Clarity & Turbidity")).toBeVisible();
    await expect(page.getByText("Stocking Density")).toBeVisible();
    await expect(page.getByText("Documented Failure Modes & Degradation Behaviors")).toBeVisible();
  });
});
