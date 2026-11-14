import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [
    ["list"],
    ["json", { outputFile: path.resolve(__dirname, process.env.PLAYWRIGHT_JSON_REPORT || "../test-results/e2e.json") }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "prod",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.PROD_URL || "http://127.0.0.1:8080",
      },
    },
  ],
  webServer: [
    {
      command:
        "cd ../backend && MPLCONFIGDIR=/tmp/matplotlib ANALYZER=baseline ENABLE_TEST_HOOKS=1 STAGE_DELAY_S=0.1 SINGLE_USER_MODE=1 DATA_DIR=/tmp/aqua-e2e /tmp/matsya-baseline-venv/bin/uvicorn app.main:app --port 8000 --host 127.0.0.1",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: Boolean(process.env.PROD_URL),
      timeout: 60000,
    },
    {
      command: "rm -rf .next/standalone/public .next/standalone/.next/static && cp -a public .next/standalone/public && mkdir -p .next/standalone/.next && cp -a .next/static .next/standalone/.next/static && PORT=3000 HOSTNAME=127.0.0.1 node .next/standalone/server.js",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: Boolean(process.env.PROD_URL),
      timeout: 60000,
    },
  ],
});
