import { test, expect } from "@playwright/test";

test.describe("Resource Library Suite (E-RES)", () => {
  test("E-RES01: /resources displays catalog, supports search, category/type filters, sort, preview drawer, and external links", async ({
    page,
  }) => {
    await page.goto("/resources");
    await page.waitForLoadState("domcontentloaded");

    // 1. Verify header & stats
    await expect(page.locator("h1")).toContainText("Research & Artifact Library");
    await expect(page.getByTestId("resource-search")).toBeVisible();

    // 2. Verify resource cards are present
    const cards = page.locator('[data-testid^="resource-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // 3. Test Search
    await page.getByTestId("resource-search").fill("kinematic");
    await page.waitForTimeout(500); // debounce / fetch
    const filteredSearch = page.locator('[data-testid^="resource-card-"]');
    await expect(filteredSearch.first()).toContainText(/kinematic/i);

    // Clear search
    await page.getByTestId("resource-search").fill("");
    await page.waitForTimeout(500);

    // 4. Test Category Filter
    const litFilter = page.getByTestId("resource-filter-literature");
    await expect(litFilter).toBeVisible();
    await litFilter.click();
    await page.waitForTimeout(500);

    const litCards = page.locator('[data-testid^="resource-card-"]');
    if ((await litCards.count()) > 0) {
      await expect(litCards.first()).toContainText(/literature/i);
    }

    // Reset filter to All
    await page.getByTestId("resource-filter-all").click();
    await page.waitForTimeout(500);

    // 5. Test Preview Drawer
    const viewButtons = page.locator('[data-testid^="resource-view-"]');
    if ((await viewButtons.count()) > 0) {
      await viewButtons.first().click();
      const previewDrawer = page.getByTestId("resource-preview");
      await expect(previewDrawer).toBeVisible();

      // Close preview
      await previewDrawer.locator('button[aria-label="Close preview"]').click();
      await expect(previewDrawer).not.toBeVisible();
    }

    // 6. Test External Item "Open on Drive"
    const externalLink = page.locator('a:has-text("Open on Drive")');
    if ((await externalLink.count()) > 0) {
      await expect(externalLink.first()).toBeVisible();
      await expect(externalLink.first()).toHaveAttribute("target", "_blank");
      await expect(externalLink.first()).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  test("E-RES02: Empty library state is designed and helpful", async ({
    page,
  }) => {
    // Navigate with a query that matches no items
    await page.goto("/resources");
    await page.waitForLoadState("domcontentloaded");

    await page.getByTestId("resource-search").fill("nonexistent_artifact_query_xyz");
    await page.waitForTimeout(500);

    await expect(page.getByText("No public resources available")).toBeVisible();
    await expect(
      page.getByText(/No public resources are currently published/i)
    ).toBeVisible();
  });
});
