import { defineConfig, devices } from '@playwright/test';

const PORT = '3100';

// Kunci dummy khusus tes e2e; bukan rahasia dan tidak dipakai di lingkungan lain.
const KUNCI_DUMMY = Buffer.alloc(32, 1).toString('base64');

// Channel opsional (mis. PW_CHANNEL=msedge untuk Edge); bawaan memakai Chromium bawaan Playwright.
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(channel ? { channel } : {}),
  },
  projects: [
    // Viewport sesuai TESTING §3: Panel 1440x900, Layar Undian 1920x1080, Publik Pixel 7.
    {
      name: 'panel',
      testMatch: [
        '**/login.spec.ts',
        '**/persiapan-periode.spec.ts',
        '**/pasca-undian.spec.ts',
        '**/publik.spec.ts',
        '**/beranda.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'layar-undian',
      testMatch: ['**/undian-offline.spec.ts', '**/pemulihan.spec.ts', '**/gladi-bersih.spec.ts'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'publik-mobile',
      testMatch: ['**/publik.spec.ts', '**/beranda.spec.ts'],
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // Menguji build produksi (sama dengan yang dijalankan di VPS), bukan server dev.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NODE_ENV: 'production',
      APP_URL: `http://localhost:${PORT}`,
      DATABASE_URL: 'postgresql://undian:undian@localhost:5433/undian_test?schema=public',
      AUTH_SECRET: KUNCI_DUMMY,
      NIK_ENCRYPTION_KEY: KUNCI_DUMMY,
      CAPTCHA_HMAC_KEY: KUNCI_DUMMY,
      STORAGE_DIR: './.storage',
    },
  },
});
