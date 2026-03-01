import { defineConfig, devices } from '@playwright/test';

const configuredCoverageDirs =
  process.env.COVERAGE_SOURCE_DIRS ??
  process.env.COVERAGE_SOURCE_DIR ??
  'app,components,lib,collections';

const coverageFilters = Object.fromEntries(
  configuredCoverageDirs
    .split(',')
    .map((dir) => dir.trim())
    .filter(Boolean)
    .map((dir) => [`**/${dir}/**`, true]),
);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    [
      'monocart-reporter',
      {
        name: 'Playwright E2E Coverage Report',
        outputFile: './monocart-report/index.html',
        coverage: {
          reports: ['v8', 'markdown-summary', 'json-summary'],
          outputDir: './monocart-report',
          sourceMap: true,
          entryFilter: {
            '**': true,
            '**/node_modules/**': false,
          },
          sourceFilter: coverageFilters,
        },
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: "NEXT_PUBLIC_TURNSTILE_SITE_KEY='' npm run dev",
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
