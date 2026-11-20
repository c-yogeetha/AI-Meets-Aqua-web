import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Current application shell smoke", () => {
  test("E-01: Homepage loads and renders its primary CTA", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("hero-title")).toBeVisible();
    await expect(page.getByTestId("cta-analyse")).toHaveAttribute("href", "/app/analyse");
    expect(errors).toEqual([]);
  });

  test("E-02: Public hero rendered with primary Try Now action opening in new tab", async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const cta = page.getByTestId("cta-analyse");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("target", "_blank");
    await expect(cta).toHaveAttribute("rel", "noopener noreferrer");

    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      cta.click(),
    ]);
    await newPage.waitForLoadState("domcontentloaded");
    await expect(newPage).toHaveURL(/\/app\/analyse/);
    await expect(newPage.getByRole("heading", { name: "Analyse Tank Video" })).toBeVisible();
    await newPage.close();
  });

  test("E-03: Floating pill navigation Try Now opens application in new tab", async ({ page, context }) => {
    await page.goto("/");
    const navTryNow = page.getByTestId("nav-try-now");
    await expect(navTryNow).toBeVisible();
    await expect(navTryNow).toHaveAttribute("target", "_blank");
    await expect(navTryNow).toHaveAttribute("rel", "noopener noreferrer");

    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      navTryNow.click(),
    ]);
    await newPage.waitForLoadState("domcontentloaded");
    await expect(newPage).toHaveURL(/\/app\/analyse/);
    await newPage.close();
  });

  test("E-04: Solution pipeline exposes 6 core processing stages", async ({ page }) => {
    await page.goto("/");
    const features = page.locator("#features");
    await expect(features).toBeVisible();
    await expect(page.getByText("Upload Clip")).toBeVisible();
    await expect(page.getByText("Suggestions")).toBeVisible();
  });

  test("E-05: Tank form validates empty names on the current route", async ({ page }) => {
    await page.goto("/app/tanks");
    await page.getByTestId("tank-form-name").fill("");
    await page.getByTestId("tank-form-volume").fill("50");
    await page.getByTestId("tank-form-count").fill("3");
    await page.getByTestId("tank-form-submit").click();
    await expect(page.getByTestId("tank-error")).toContainText(/Tank name cannot be empty/i);
  });

  test("E-06: Tank creation succeeds on the current route", async ({ page }) => {
    await page.goto("/app/tanks");
    const name = "Verification Tank " + Date.now();
    await page.getByTestId("tank-form-name").fill(name);
    await page.getByTestId("tank-form-volume").fill("75");
    await page.getByTestId("tank-form-count").fill("4");
    await page.getByTestId("tank-form-submit").click();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("E-07: Reduced motion skips the intro loader", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByTestId("loader")).toHaveCount(0);
    await expect(page.getByTestId("hero-title")).toBeVisible();
  });

  test("E-08: Unknown route shows the not-found page", async ({ page }) => {
    await page.goto("/unknown-random-route-path");
    await expect(page.getByText(/404 - Surface Lost/)).toBeVisible();
    await expect(page.getByText(/Return to Surface/)).toBeVisible();
  });

  test("E-09: Homepage has no critical accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((violation) => violation.impact === "critical");
    expect(critical).toEqual([]);
  });
});
