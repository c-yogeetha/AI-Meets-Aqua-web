const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const WIDTHS = [390, 768, 1024, 1440];
const ROUTES = [
  { path: "/", name: "home" },
  { path: "/science", name: "science" },
  { path: "/how-it-works", name: "how-it-works" },
  { path: "/about", name: "about" },
  { path: "/resources", name: "resources" },
  { path: "/validation", name: "validation" },
  { path: "/app/tanks", name: "app-tanks" },
  { path: "/app/analyse", name: "app-analyse" },
  { path: "/app/history", name: "app-history" },
  { path: "/app/insights", name: "app-insights" },
  { path: "/app/alerts", name: "app-alerts" },
  { path: "/app/reports", name: "app-reports" },
  { path: "/app/settings", name: "app-settings" },
];

async function main() {
  const outDir = path.resolve(__dirname, "../docs/screens");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // Check if we can seed or get a completed result ID for app-results
  let routesToCapture = [...ROUTES];
  try {
    const seedRes = await fetch("http://127.0.0.1:8000/api/v1/demo/seed", { method: "POST" });
    if (seedRes.ok) {
      const data = await seedRes.json();
      if (data.result_ids && data.result_ids.length > 0) {
        routesToCapture.push({
          path: `/app/results/${data.result_ids[0]}`,
          name: "app-results",
        });
      }
    }
  } catch (e) {
    // Backend might not be running or seed failed
  }

  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Set visited session storage so loader doesn't block
    await page.addInitScript(() => {
      window.sessionStorage.setItem("matsya_visited", "true");
      window.sessionStorage.setItem("aqua_visited", "true");
    });

    for (const route of routesToCapture) {
      const url = `http://127.0.0.1:3000${route.path}`;
      const outFile = path.join(outDir, `${route.name}-${width}.png`);
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
        await page.waitForTimeout(500); // Allow render settle
        await page.screenshot({ path: outFile, fullPage: true });
        console.log(`Captured ${route.name} at ${width}px -> ${outFile}`);
      } catch (err) {
        console.error(`Error capturing ${url} at ${width}px: ${err.message}`);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log("Visual review screenshots captured successfully.");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
