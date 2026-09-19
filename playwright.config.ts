import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3002'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '.local/playwright-results',
  reporter: [['list'], ['html', { outputFolder: '.local/playwright-report', open: 'never' }]],
  workers: 2,
  timeout: 30000,
  use: {
    baseURL, serviceWorkers: 'block', reducedMotion: 'reduce',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  projects: [320, 390, 768, 1440].flatMap(width => (['light', 'dark'] as const).map(colorScheme => ({
    name: `${width}-${colorScheme}`, use: { viewport: { width, height: 900 }, colorScheme },
  }))),
  webServer: {
    command: 'node node_modules/next/dist/bin/next start -p 3002',
    url: baseURL, reuseExistingServer: !process.env.CI,
  },
})
