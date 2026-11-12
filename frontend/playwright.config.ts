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
    ["json", { outputFile: path.resolve(__dirname, "../test-results/e2e.json") }],
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
        "cd ../backend && MPLCONFIGDIR=/tmp/matplotlib ANALYZER=baseline ENABLE_TEST_HOOKS=1 STAGE_DELAY_S=0.1 SINGLE_USER_MODE=1 DATA_DIR=/tmp/aqua-e2e .venv/bin/uvicorn app.main:app --port 8000 --host 127.0.0.1",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: "npm run start -- -p 3000 -H 127.0.0.1",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
