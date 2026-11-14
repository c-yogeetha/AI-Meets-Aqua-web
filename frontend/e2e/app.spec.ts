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

  test("E-02: Desktop depth rail updates as the page scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const rail = page.getByTestId("depth-rail");
    await expect(rail).toBeAttached();
    const before = await rail.innerText();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await page.waitForTimeout(250);
    const after = await rail.innerText();
    expect(after).not.toBe(before);
  });

  test("E-03: Public analysis CTA enters the current /app route", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("cta-analyse").click();
    await expect(page).toHaveURL(/\/app\/analyse/);
    await expect(page.getByRole("heading", { name: "Analyse Tank Video" })).toBeVisible();
  });

  test("E-04: FAQ accordion exposes the current behavioural-indicator explanation", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByTestId("faq-trigger-0");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/Matsya quantifies five core behavioural stress indicators/)).toBeVisible();
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
