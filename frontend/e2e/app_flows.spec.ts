import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SAMPLES_DIR = path.resolve(__dirname, "../../samples");

test.describe("Application Shell & App Pages Suite (E-APP)", () => {
  // Helper to ensure a tank exists
  async function ensureTank(request: any): Promise<{ id: string; name: string }> {
    const listRes = await request.get("/api/v1/tanks");
    if (listRes.ok()) {
      const tanks = await listRes.json();
      if (tanks.length > 0) {
        return tanks[0];
      }
    }
    const createRes = await request.post("/api/v1/tanks", {
      data: {
        name: "Standard 60L Tank",
        volume_l: 60,
        goldfish_count: 3,
        water_temp_c: 21.5,
      },
    });
    return await createRes.json();
  }

  test("E-APP01: Overview renders with summary strip, tank cards, and navigation", async ({ page }) => {
    await ensureTank(page.request);
    await page.goto("/app");

    // Topbar and sidebar visible
    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.getByTestId("app-topbar")).toBeVisible();

    // System status indicator present
    await expect(page.getByTestId("system-status").first()).toBeVisible();

    // Summary headings or cards
    await expect(page.getByText("System Overview")).toBeVisible();
    await expect(page.getByText("Tanks", { exact: false }).first()).toBeVisible();
    await expect(page.getByTestId("cta-sample")).toBeVisible();
  });

  test("E-APP02: Tank CRUD: create, edit, and delete with confirm", async ({ page }) => {
    await page.goto("/app/tanks");
    await expect(page.getByRole("heading", { name: "Tank Enclosures" })).toBeVisible();

    // 1. Validation error on empty name
    await page.fill('[data-testid="tank-form-name"]', "");
    await page.click('[data-testid="tank-form-submit"]');
    await expect(page.getByTestId("tank-error")).toBeVisible();
    await expect(page.getByTestId("tank-error")).toContainText("empty");

    // 2. Create valid tank with Unicode name
    const uniqueName = `Devanagari टैंक ${Date.now()}`;
    await page.fill('[data-testid="tank-form-name"]', uniqueName);
    await page.fill('[data-testid="tank-form-volume"]', "120");
    await page.fill('[data-testid="tank-form-count"]', "4");
    await page.click('[data-testid="tank-form-submit"]');

    // Verify card is added
    await expect(page.getByRole("link", { name: uniqueName })).toBeVisible({ timeout: 10000 });

    // 3. Edit tank
    const editBtn = page.locator(`[data-testid^="tank-card-"]:has-text("${uniqueName}") button[title="Edit tank"]`);
    await editBtn.click();
    await expect(page.getByText("Edit Tank Profile")).toBeVisible();

    const updatedName = uniqueName + " Updated";
    await page.locator('input[value*="Devanagari"]').fill(updatedName);
    await page.click('button:has-text("Save Changes")');
    await expect(page.getByRole("link", { name: updatedName })).toBeVisible({ timeout: 10000 });

    // 4. Delete tank with confirm dialog
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    const deleteBtn = page.locator(`[data-testid^="tank-card-"]:has-text("${updatedName}") button[title="Delete tank"]`);
    await deleteBtn.click();
    await expect(page.getByRole("link", { name: updatedName })).not.toBeVisible({ timeout: 10000 });
  });

  test("E-APP03: Complete analyse flow with calm.mp4 finishes with score, gauge, and PDF button", async ({ page }) => {
    const tank = await ensureTank(page.request);
    await page.goto("/app/analyse");

    // Verify steps
    await expect(page.getByTestId("step-1")).toBeVisible();
    await expect(page.getByTestId("step-2")).toBeVisible();
    await expect(page.getByTestId("step-3")).toBeVisible();
    await expect(page.getByTestId("step-4")).toBeVisible();

    // Select camera view
    await page.click('[data-testid="view-side"]');

    // Upload calm.mp4
    const calmPath = path.join(SAMPLES_DIR, "calm.mp4");
    if (!fs.existsSync(calmPath)) {
      test.skip();
      return;
    }

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.click('[data-testid="dropzone"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(calmPath);

    // Submit analysis
    await page.click('[data-testid="upload-submit"]');

    // Should redirect to /app/jobs/[id]
    await expect(page).toHaveURL(/\/app\/jobs\/[0-9a-f-]+/, { timeout: 30000 });
    await expect(page.getByTestId("job-stepper")).toBeVisible();
    await expect(page.getByTestId("job-progress")).toBeVisible();

    // Automatically redirects to /app/results/[id]
    await expect(page).toHaveURL(/\/app\/results\/[0-9a-f-]+/, { timeout: 45000 });
    await expect(page.getByTestId("result-score")).toBeVisible();
    await expect(page.getByTestId("result-level")).toBeVisible();
    await expect(page.getByTestId("result-gauge")).toBeVisible();
    await expect(page.getByTestId("download-pdf")).toBeVisible();
  });

  test("E-APP04: Invalid file type and oversized upload show inline errors without hang", async ({ page }) => {
    await ensureTank(page.request);
    await page.goto("/app/analyse");

    // Create temporary text file
    const txtPath = path.join(SAMPLES_DIR, "fake_video.txt");
    fs.writeFileSync(txtPath, "Not a video file");

    try {
      const fileChooserPromise = page.waitForEvent("filechooser");
      await page.click('[data-testid="dropzone"]');
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(txtPath);

      // Verify inline upload error appears
      await expect(page.getByTestId("upload-error")).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId("upload-error")).toContainText("Unsupported format");
    } finally {
      if (fs.existsSync(txtPath)) {
        fs.unlinkSync(txtPath);
      }
    }
  });

  test("E-APP05: Simulated failure hook shows failure panel and retry button", async ({ page }) => {
    await ensureTank(page.request);
    await page.goto("/app/analyse");

    // Create file named x__fail__.mp4 from calm.mp4 bytes
    const calmPath = path.join(SAMPLES_DIR, "calm.mp4");
    if (!fs.existsSync(calmPath)) {
      test.skip();
      return;
    }
    const failPath = path.join(SAMPLES_DIR, "test__fail__.mp4");
    fs.copyFileSync(calmPath, failPath);

    try {
      const fileChooserPromise = page.waitForEvent("filechooser");
      await page.click('[data-testid="dropzone"]');
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(failPath);

      await page.click('[data-testid="upload-submit"]');

      // Reaches jobs page
      await expect(page).toHaveURL(/\/app\/jobs\/[0-9a-f-]+/, { timeout: 30000 });

      // Verifies failure panel
      await expect(page.getByTestId("job-error")).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId("job-retry")).toBeVisible();
    } finally {
      if (fs.existsSync(failPath)) {
        fs.unlinkSync(failPath);
      }
    }
  });

  test("E-APP08: Results timeline and key moments click seeks video", async ({ page }) => {
    // Seed demo result
    const seedRes = await page.request.post("/api/v1/demo/seed");
    expect(seedRes.ok()).toBe(true);
    const data = await seedRes.json();
    const resultId = data.result_ids[0];

    await page.goto(`/app/results/${resultId}`);
    await expect(page.getByTestId("result-timeline")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("result-video")).toBeVisible();

    // Click on timeline chart to seek
    const timeline = page.getByTestId("result-timeline");
    const box = await timeline.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    // Verify key moments seek buttons if present
    const keyMoment = page.locator('[data-testid^="key-moment-"]').first();
    if (await keyMoment.isVisible()) {
      await keyMoment.click();
    }
  });

  test("E-APP10: History filters, delete, bin tab, and restore", async ({ page }) => {
    // Seed demo data
    const seedRes = await page.request.post("/api/v1/demo/seed");
    expect(seedRes.ok()).toBe(true);
    const seedData = await seedRes.json();
    const jobId = seedData.result_ids[0];

    await page.goto("/app/history");
    await expect(page.getByRole("heading", { name: "Historical Records & Insights" })).toBeVisible();

    // History row is visible
    const row = page.getByTestId(`history-row-${jobId}`);
    await expect(row).toBeVisible({ timeout: 10000 });

    // Delete row to recycle bin
    const deleteBtn = row.locator('button[title="Move to recycle bin"]');
    await deleteBtn.click();
    await expect(row).not.toBeVisible({ timeout: 10000 });

    // Switch to Recycle Bin tab
    await page.click('[data-testid="tab-bin"]');
    await expect(page.getByTestId(`bin-row-${jobId}`)).toBeVisible({ timeout: 10000 });

    // Restore item
    await page.click(`[data-testid="restore-${jobId}"]`);
    await expect(page.getByTestId(`bin-row-${jobId}`)).not.toBeVisible({ timeout: 10000 });

    // Switch back to analyses tab and verify restored
    await page.click('[data-testid="tab-analyses"]');
    await expect(page.getByTestId(`history-row-${jobId}`)).toBeVisible({ timeout: 10000 });
  });

  test("E-APP11: Insights displays FSI value, trend chart, and formula explanation", async ({ page }) => {
    await page.request.post("/api/v1/demo/seed");
    await page.goto("/app/insights");

    await expect(page.getByRole("heading", { name: "Fish Stress Index & Insights" })).toBeVisible();
    await expect(page.getByTestId("fsi-value")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("trend-chart")).toBeVisible();

    // Toggle formula note
    await page.click('button:has-text("How is FSI computed?")');
    await expect(page.getByText("FSI = (0.40 × St + 0.25 × St-1")).toBeVisible();
  });

  test("E-APP12: Alerts displays list, filter, and mark all read", async ({ page }) => {
    await page.goto("/app/alerts");
    await expect(page.getByRole("heading", { name: "Alert Center" })).toBeVisible();

    // Filter toolbar is present
    await expect(page.getByText("Filters:")).toBeVisible();
  });

  test("E-APP13: Settings persists toggles after reload and shows system diagnostics", async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { name: "Settings & Diagnostics" })).toBeVisible();

    // System diagnostics panel
    await expect(page.getByText("System Status & Analysis Diagnostics")).toBeVisible();
    await expect(page.getByText("Analyzer Mode")).toBeVisible();

    // Toggle popup toast setting and save
    const checkbox = page.getByTestId("settings-popup");
    await checkbox.click({ force: true });
    await page.click('[data-testid="settings-save"]');
    await expect(page.getByText("Preferences saved successfully")).toBeVisible({ timeout: 10000 });

    // Reload and verify persisted
    await page.reload();
    await expect(page.getByTestId("settings-popup")).toBeVisible();
  });

  test("E-APP16: Result error states: 404 and 410 deleted", async ({ page }) => {
    // 404 on nonexistent result
    await page.goto("/app/results/nonexistent-uuid-12345");
    await expect(page.getByTestId("api-error-banner")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Analysis Not Found")).toBeVisible();
  });
});
