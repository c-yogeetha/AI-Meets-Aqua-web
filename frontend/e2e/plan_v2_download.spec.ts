import { test, expect } from "@playwright/test";
import fs from "fs";
import { PDFDocument } from "pdf-lib";

test.describe("Plan v2 browser download verification", () => {
  test("E-PDF-01: sample result downloads a parseable PDF", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cta-sample").click();
    await expect(page).toHaveURL(/\/app\/results\//, { timeout: 30000 });
    const initial = page.url();
    const downloadEvent = page.waitForEvent("download");
    await page.getByTestId("download-pdf").click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/^matsya-report-[0-9a-f]{8}\.pdf$/);
    const file = await download.path();
    expect(file).toBeTruthy();
    const bytes = fs.readFileSync(file!);
    expect(bytes.byteLength).toBeGreaterThan(20 * 1024);
    expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(page.url()).toBe(initial);
  });

  test("E-PDF-02: result PDF endpoint sends safe attachment headers", async ({ page }) => {
    const seed = await page.request.post("/api/v1/demo/seed");
    expect(seed.ok()).toBeTruthy();
    const data = await seed.json();
    const jobId = data.result_ids[0];
    const response = await page.request.get(`/api/v1/results/${jobId}/report.pdf`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["content-disposition"]).toMatch(/filename="matsya-report-[0-9a-f]{8}\.pdf"/);
    const bytes = await response.body();
    expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
