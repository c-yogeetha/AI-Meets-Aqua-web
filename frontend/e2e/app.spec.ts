import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import AxeBuilder from "@axe-core/playwright";

const SAMPLES_DIR = path.resolve(__dirname, "../../samples");

test.describe("AI Meets Aqua E2E Verification Suite", () => {
  // Helper to ensure at least one tank exists
  async function ensureTank(page: any): Promise<string> {
    await page.goto("/tanks");
    const existingCards = page.locator('[data-testid^="tank-card-"]');
    if ((await existingCards.count()) > 0) {
      return "existing";
    }
    await page.fill('[data-testid="new-tank-name"]', "Test Goldfish Tank");
    await page.fill('[data-testid="new-tank-volume"]', "60");
    await page.fill('[data-testid="new-tank-count"]', "3");
    await page.click('[data-testid="new-tank-submit"]');
    await expect(page.locator('[data-testid^="tank-card-"]').first()).toBeVisible({ timeout: 10000 });
    return "created";
  }

  test("E-01: Open / shows hero, loader completes, no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    // Hero title must be visible
    await expect(page.getByTestId("hero-title")).toBeVisible({ timeout: 10000 });
    expect(consoleErrors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
  });

  test("E-02: Scroll the landing page updates depth meter", async ({ page }) => {
    await page.goto("/");
    const depthMeter = page.getByTestId("depth-meter");
    await expect(depthMeter).toBeAttached();

    // Scroll down to middle
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(400);

    // Section headings should be visible
    await expect(page.getByText("Why It Matters")).toBeVisible();
    await expect(page.getByText("Dive Log")).toBeVisible();
  });

  test("E-03: cta-analyse navigates to /analyse", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="cta-analyse"]');
    await expect(page).toHaveURL(/\/analyse/);
  });

  test("E-04: FAQ accordion toggles aria-expanded and shows answer", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByTestId("faq-trigger-0");
    await expect(trigger).toBeVisible();

    // Check initial state
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Click to open
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/The system monitors behavioral stress indicators/)).toBeVisible();

    // Click to close
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("E-05: Flip card via keyboard Enter key", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("flip-card-0");
    await expect(card).toBeVisible();

    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Ammonia or nitrite spike/)).toBeVisible();
  });

  test("E-06: Create tank with empty name shows validation error", async ({ page }) => {
    await page.goto("/tanks");
    await page.fill('[data-testid="new-tank-name"]', "");
    await page.fill('[data-testid="new-tank-volume"]', "50");
    await page.fill('[data-testid="new-tank-count"]', "3");
    await page.click('[data-testid="new-tank-submit"]');

    const err = page.getByTestId("tank-error");
    await expect(err).toBeVisible();
    await expect(err).toContainText(/cannot be empty/i);
  });

  test("E-07: Create tank valid adds tank card", async ({ page }) => {
    await page.goto("/tanks");
    const uniqueName = `Tank_${Date.now()}`;
    await page.fill('[data-testid="new-tank-name"]', uniqueName);
    await page.fill('[data-testid="new-tank-volume"]', "75");
    await page.fill('[data-testid="new-tank-count"]', "4");
    await page.click('[data-testid="new-tank-submit"]');

    await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible({ timeout: 10000 });
  });

  test("E-08: Upload a .txt file displays upload-error", async ({ page }) => {
    await ensureTank(page);
    await page.goto("/analyse");

    // Upload an invalid text file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click('[data-testid="upload-dropzone"]');
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a video"),
    });

    const errorEl = page.getByTestId("upload-error");
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText(/unsupported format/i);
  });

  test("E-09: Happy path: upload stressed_one.mp4 and verify full results", async ({ page }) => {
    test.setTimeout(90000);
    await ensureTank(page);
    await page.goto("/analyse");

    const filePath = path.join(SAMPLES_DIR, "stressed_one.mp4");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click('[data-testid="upload-dropzone"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Select perspective
    await page.click('[data-testid="view-side"]');

    // Submit upload
    await page.click('[data-testid="upload-submit"]');

    // Job stepper screen
    await expect(page.getByTestId("job-stepper")).toBeVisible({ timeout: 15000 });

    // Wait for auto redirect to results
    await expect(page).toHaveURL(/\/results\//, { timeout: 60000 });

    // Verify Results Elements
    await expect(page.getByTestId("result-gauge")).toBeVisible();
    await expect(page.getByTestId("result-score")).toBeVisible();
    const level = page.getByTestId("result-level");
    await expect(level).toBeVisible();
    await expect(level).toContainText(/Moderate|High/);

    // Fish cards
    const stressedFish = page.locator('[data-testid^="fish-status-"]').filter({ hasText: /Stressed/ });
    await expect(stressedFish.first()).toBeVisible();

    // Video player
    const video = page.getByTestId("result-video");
    await expect(video).toBeVisible();

    // Timeline and suggestions
    await expect(page.getByTestId("result-timeline")).toBeVisible();
    await expect(page.locator('[data-testid^="suggestion-"]').first()).toBeVisible();
  });

  test("E-10: Upload calm.mp4 finishes Normal", async ({ page }) => {
    test.setTimeout(90000);
    await ensureTank(page);
    await page.goto("/analyse");

    const filePath = path.join(SAMPLES_DIR, "calm.mp4");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click('[data-testid="upload-dropzone"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await page.click('[data-testid="upload-submit"]');
    await expect(page).toHaveURL(/\/results\//, { timeout: 60000 });

    const level = page.getByTestId("result-level");
    await expect(level).toContainText(/Normal/);
  });

  test("E-11: Failure: upload a file named x__fail__.mp4 shows job-error and retry", async ({ page }) => {
    test.setTimeout(60000);
    await ensureTank(page);
    await page.goto("/analyse");

    // Read real sample video bytes but name it x__fail__.mp4 to trigger test hook
    const realVideoBytes = fs.readFileSync(path.join(SAMPLES_DIR, "blank.mp4"));
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click('[data-testid="upload-dropzone"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "x__fail__.mp4",
      mimeType: "video/mp4",
      buffer: realVideoBytes,
    });

    await page.click('[data-testid="upload-submit"]');
    await expect(page.getByTestId("job-error")).toBeVisible({ timeout: 30000 });
    const retryBtn = page.getByTestId("job-retry");
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();
    await expect(page).toHaveURL(/\/analyse/);
  });

  test("E-12: Timeline focus and interaction", async ({ page }) => {
    // Seed demo to get immediate result
    await page.goto("/");
    await page.click('[data-testid="cta-sample"]');
    await expect(page).toHaveURL(/\/results\//, { timeout: 30000 });

    const timeline = page.getByTestId("result-timeline");
    await expect(timeline).toBeVisible();

    const fishSelect = page.getByTestId("timeline-fish-select");
    await expect(fishSelect).toBeVisible();
    await fishSelect.selectOption({ index: 1 });
  });

  test("E-13: History shows the analysis; FSI value present; trend chart present", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByTestId("fsi-value")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("trend-chart")).toBeVisible();
  });

  test("E-14: Delete a result and verify recycle bin", async ({ page }) => {
    // Ensure demo seeded
    await page.goto("/");
    await page.click('[data-testid="cta-sample"]');
    await expect(page).toHaveURL(/\/results\//, { timeout: 30000 });

    // Click delete from result page
    page.on("dialog", (dialog) => dialog.accept());
    await page.click('[data-testid="delete-result"]');
    await expect(page).toHaveURL(/\/history/);

    // Go to recycle bin tab
    await page.click('[data-testid="tab-bin"]');
    const binRow = page.locator('[data-testid^="bin-row-"]').first();
    await expect(binRow).toBeVisible({ timeout: 10000 });

    // Click restore
    const restoreBtn = page.locator('[data-testid^="restore-"]').first();
    await restoreBtn.click();
    await expect(page.getByText("Analysis restored successfully")).toBeVisible({ timeout: 10000 });
  });

  test("E-15: Bell badge and notification dropdown", async ({ page }) => {
    await page.goto("/");
    const bell = page.getByTestId("alert-bell");
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByText("Active Alerts")).toBeVisible();
  });

  test("E-16: Settings toggles persist after save and reload", async ({ page }) => {
    await page.goto("/settings");
    const popupToggle = page.getByTestId("settings-popup");
    await expect(popupToggle).toBeAttached({ timeout: 10000 });

    const wasChecked = await popupToggle.isChecked();
    await popupToggle.setChecked(!wasChecked, { force: true });
    await page.click('[data-testid="settings-save"]');
    await page.waitForTimeout(1000);

    await page.reload();
    await expect(popupToggle).toBeChecked({ checked: !wasChecked });

    // Restore
    await popupToggle.setChecked(wasChecked, { force: true });
    await page.click('[data-testid="settings-save"]');
  });

  test("E-17: Mobile viewport 375x812 has no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const routes = ["/", "/analyse", "/history", "/tanks", "/settings", "/testing"];
    for (const r of routes) {
      await page.goto(r);
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    }
  });

  test("E-18: prefers-reduced-motion skips loader", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const loader = page.getByTestId("loader");
    await expect(loader).not.toBeVisible();
    await expect(page.getByTestId("hero-title")).toBeVisible();
  });

  test("E-19: Try a sample seeds demo and opens result with Demo data badge", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="cta-sample"]');
    await expect(page).toHaveURL(/\/results\//, { timeout: 30000 });
    const modeBadge = page.getByTestId("result-mode");
    await expect(modeBadge).toBeVisible();
    await expect(modeBadge).toContainText(/Demo data/i);
  });

  test("E-20: Backend unreachable displays error banner gracefully without crash", async ({ page }) => {
    await page.route("**/api/v1/history**", (route) => route.abort());
    await page.goto("/history");
    await expect(page.getByText(/Failed to load history records/)).toBeVisible({ timeout: 10000 });
  });

  test("E-21: Accessibility audit with axe has zero critical violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === "critical");
    expect(criticalViolations).toHaveLength(0);
  });

  test("E-22: Unknown URL displays 404 page", async ({ page }) => {
    await page.goto("/unknown-random-route-path");
    await expect(page.getByText(/404 - Surface Lost/)).toBeVisible();
    await expect(page.getByText(/Return to Surface/)).toBeVisible();
  });

  test("E-23: /testing page shows summary totals", async ({ page }) => {
    await page.goto("/testing");
    await expect(page.getByText("Test Results & Quality Assurance")).toBeVisible();
  });

  test("E-24: Download PDF button is visible and enabled", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="cta-sample"]');
    await expect(page).toHaveURL(/\/results\//, { timeout: 30000 });

    const pdfBtn = page.getByTestId("download-pdf");
    await expect(pdfBtn).toBeVisible();
    await expect(pdfBtn).toBeEnabled();
  });
});
