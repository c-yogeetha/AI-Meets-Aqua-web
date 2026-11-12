import { test, expect } from "@playwright/test";
import fs from "fs";

test.describe("PDF Download & Media Verification Suite (E-DL)", () => {
  test("E-DL01: Click Download PDF triggers browser download with valid file and no navigation", async ({ page }) => {
    // 1. Open home and click sample demo
    await page.goto("/");
    await page.click('[data-testid="cta-sample"]');
    await expect(page).toHaveURL(/\/(app\/)?results\//, { timeout: 30000 });

    const initialUrl = page.url();
    const pdfBtn = page.getByTestId("download-pdf");
    await expect(pdfBtn).toBeVisible({ timeout: 15000 });
    await expect(pdfBtn).toBeEnabled();

    // 2. Start waiting for browser download event
    const downloadPromise = page.waitForEvent("download");

    // 3. Click Download PDF button
    await pdfBtn.click();

    // 4. Await download event
    const download = await downloadPromise;

    // 5. Verify suggested filename matches ^matsya-report-[0-9a-f]{8}\.pdf$
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^matsya-report-[0-9a-f]{8}\.pdf$/);

    // 6. Verify downloaded content is valid PDF > 8 KB
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const buf = fs.readFileSync(downloadPath!);
    expect(buf.length).toBeGreaterThan(8000);
    expect(buf.toString("latin1").startsWith("%PDF")).toBe(true);

    // 7. Verify page URL did not change and button is re-enabled
    expect(page.url()).toBe(initialUrl);
    await expect(pdfBtn).toBeEnabled({ timeout: 10000 });
  });

  test("E-DL02: Tank names in Devanagari, emoji and 120 characters download valid PDF", async ({ page }) => {
    const complexName = "गोल्डफिश 🐠 Tank " + "A".repeat(100);

    // 1. Create tank with complex Unicode name
    const tankRes = await page.request.post("/api/v1/tanks", {
      data: {
        name: complexName,
        volume_l: 60,
        goldfish_count: 3,
        water_temp_c: 21.5,
      },
    });
    expect(tankRes.ok()).toBe(true);

    // 2. Seed a result via demo seed
    const seedRes = await page.request.post("/api/v1/demo/seed");
    expect(seedRes.ok()).toBe(true);
    const seedData = await seedRes.json();
    const jobId = seedData.result_ids[0];

    // Open result page
    await page.goto(`/app/results/${jobId}`);
    const pdfBtn = page.getByTestId("download-pdf");
    await expect(pdfBtn).toBeVisible({ timeout: 15000 });

    // Click and download
    const downloadPromise = page.waitForEvent("download");
    await pdfBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^matsya-report-[0-9a-f]{8}\.pdf$/);
    const downloadPath = await download.path();
    const buf = fs.readFileSync(downloadPath!);
    expect(buf.length).toBeGreaterThan(8000);
    expect(buf.toString("latin1").startsWith("%PDF")).toBe(true);
  });

  test("E-DL03: Server error shows error toast, does not navigate, re-enables button", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="cta-sample"]');
    await expect(page).toHaveURL(/\/(app\/)?results\//, { timeout: 30000 });

    const initialUrl = page.url();
    const pdfBtn = page.getByTestId("download-pdf");
    await expect(pdfBtn).toBeVisible({ timeout: 15000 });

    // Mock PDF endpoint failure
    await page.route("**/report.pdf", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "internal_server_error",
            message: "Report generation failed on server",
          },
        }),
      });
    });

    await pdfBtn.click();

    // Verify error toast appears with message
    await expect(page.getByText(/Report generation failed on server/)).toBeVisible({ timeout: 10000 });

    // Verify URL did not change and button is re-enabled
    expect(page.url()).toBe(initialUrl);
    await expect(pdfBtn).toBeEnabled({ timeout: 10000 });
  });

  test("E-DL05: Media elements on result page respond 200 or 206", async ({ page }) => {
    await page.goto("/");
    await page.click('[data-testid="cta-sample"]');
    await expect(page).toHaveURL(/\/(app\/)?results\//, { timeout: 30000 });

    const video = page.getByTestId("result-video");
    await expect(video).toBeVisible({ timeout: 15000 });

    // Verify video source responds 200 or 206
    const videoSource = video.locator("source").first();
    const videoSrc = (await videoSource.getAttribute("src")) || (await video.getAttribute("src"));
    expect(videoSrc).toBeTruthy();

    const videoHead = await page.request.get(videoSrc!, {
      headers: { Range: "bytes=0-1024" },
    });
    expect([200, 206]).toContain(videoHead.status());

    // Verify PDF endpoint responds 200
    const currentUrl = page.url();
    const jobId = currentUrl.split("/").pop();
    const pdfResp = await page.request.get(`/api/v1/results/${jobId}/report.pdf`);
    expect(pdfResp.status()).toBe(200);
    expect(pdfResp.headers()["content-type"]).toBe("application/pdf");
  });
});
