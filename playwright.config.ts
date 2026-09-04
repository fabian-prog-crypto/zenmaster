import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/extension",
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
  outputDir: "test-results/extension"
});
