import { expect, test } from "@playwright/test";

test("static showcase pages work without API requests", async ({ page, request, baseURL }) => {
  const apiRequests: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.pathname.startsWith("/api/")) apiRequests.push(req.url());
  });

  const routes = ["/", "/about/", "/how-it-works/", "/resources/", "/science/", "/validation/", "/app/", "/app/analyse/", "/app/tanks/", "/app/settings/", "/app/history/"];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), `${route} should be exported`).toBe(200);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  }

  const hrefs = await page.locator('a[href^="/"]').evaluateAll((els) =>
    Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute("href") || "")))
      .filter((href) => href && !href.startsWith("//") && !href.startsWith("#")),
  );
  for (const href of hrefs) {
    const response = await request.get(new URL(href, baseURL).toString());
    expect(response.status(), `internal link ${href}`).toBeLessThan(400);
  }

  expect(apiRequests).toEqual([]);
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /");
});

test("showcase gallery and bundled resource files are present", async ({ page }) => {
  await page.goto("/app/");
  await expect(page.getByRole("heading", { name: "Featured analyses" })).toBeVisible();
  await page.goto("/app/results/synthetic-calm-swimming/");
  await expect(page.getByRole("heading", { name: /Calm swimming/ })).toBeVisible();
  await expect(page.getByText("Synthetic demonstration — not observed aquarium footage.")).toBeVisible();
  await expect(page.getByTestId("showcase-read-only-banner")).toBeVisible();

  await page.goto("/app/analyse/");
  await expect(page.getByRole("heading", { name: "This feature is available in the live app." })).toBeVisible();
  await expect(page.getByTestId("showcase-read-only-banner")).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await page.goto("/resources/");
  await expect(page.getByRole("heading", { name: "Research & artifact library" })).toBeVisible();
  await expect(page.getByText("Synthetic project material").first()).toBeVisible();
});
