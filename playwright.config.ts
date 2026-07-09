import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Config Playwright — QAops.
 * baseURL vient de .env (RENTAL_APP_BASE_URL), renseigné en Phase 1.
 * Bonnes pratiques : retries en CI, trace/vidéo on-first-retry, reporter HTML.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.RENTAL_APP_BASE_URL,
    // Preuve d'exécution : trace + screenshot systématiques (visualisables dans le rapport HTML).
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
