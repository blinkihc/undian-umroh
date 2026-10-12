import { defineConfig, devices } from '@playwright/test';

import { APP_URL_E2E, PORT_E2E, URL_DB_E2E } from './tests/support/env-e2e';

// Kunci dummy khusus tes e2e; bukan rahasia dan tidak dipakai di lingkungan lain.
const KUNCI_DUMMY = Buffer.alloc(32, 1).toString('base64');

// Channel opsional (mis. PW_CHANNEL=msedge untuk Edge); bawaan memakai Chromium bawaan Playwright.
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: './tests/e2e',
  // Membuat database e2e baru + migrasi. Butuh PostgreSQL tes: npm run db:test:up.
  globalSetup: './tests/e2e/global-setup.ts',
  // Tunggu assertion 10 detik: server produksi + argon2 + PostgreSQL di laptop lambat butuh lebih dari 5.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // Satu server Next produksi dipakai bersama semua tes; terlalu banyak peramban paralel membuat
  // login (argon2 + tiga render server) saling berebut CPU di laptop 4 inti.
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: APP_URL_E2E,
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
        '**/tampilan-panel.spec.ts',
        '**/kelola-pengguna.spec.ts',
        '**/kelola-periode.spec.ts',
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
    command: `npm run build && npm run start -- --port ${PORT_E2E}`,
    url: APP_URL_E2E,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Log server hanya ditampilkan bila E2E_LOG_LEVEL diisi (penelusuran tes lambat).
    stdout: process.env.E2E_LOG_LEVEL ? 'pipe' : 'ignore',
    env: {
      NODE_ENV: 'production',
      APP_URL: APP_URL_E2E,
      DATABASE_URL: URL_DB_E2E,
      AUTH_SECRET: KUNCI_DUMMY,
      NIK_ENCRYPTION_KEY: KUNCI_DUMMY,
      CAPTCHA_HMAC_KEY: KUNCI_DUMMY,
      STORAGE_DIR: './.storage',
      // E2E_LOG_LEVEL=info menampilkan durasi tiap request server untuk menelusuri tes lambat.
      LOG_LEVEL: process.env.E2E_LOG_LEVEL ?? 'warn',
    },
  },
});
