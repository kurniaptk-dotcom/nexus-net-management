import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: "on",
    trace: "on-first-retry",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
