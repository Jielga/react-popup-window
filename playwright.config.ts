import { defineConfig } from '@playwright/test'

// Set PLAYWRIGHT_CHROMIUM_PATH to a Chromium binary to use it instead of the
// browsers downloaded by `npx playwright install`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/react-popup-window/',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://localhost:4173/react-popup-window/',
    reuseExistingServer: !process.env.CI,
  },
})
