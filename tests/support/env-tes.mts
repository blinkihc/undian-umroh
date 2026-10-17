/**
 * Env khusus tes. Kunci hanya berisi bait konstan: bukan rahasia dan tidak boleh dipakai di
 * lingkungan lain. Dipakai Vitest (config) dan global setup integrasi.
 */

const KUNCI_DUMMY = Buffer.alloc(32, 3).toString('base64');

export const APP_URL_TES = 'https://undian.example.test';

/** PostgreSQL tes dari docker-compose.test.yml (npm run db:test:up). */
export const URL_DB_TES =
  process.env.DATABASE_URL_TEST ??
  'postgresql://undian:undian@127.0.0.1:5433/undian_test?schema=public';

export const ENV_TES: Record<string, string> = {
  NODE_ENV: 'test',
  // HTTPS agar cookie sesi diuji dalam bentuk produksinya (Secure, awalan __Secure-).
  APP_URL: APP_URL_TES,
  DATABASE_URL: URL_DB_TES,
  AUTH_SECRET: KUNCI_DUMMY,
  NIK_ENCRYPTION_KEY: KUNCI_DUMMY,
  CAPTCHA_HMAC_KEY: KUNCI_DUMMY,
  STORAGE_DIR: './.storage',
  LOG_LEVEL: 'error',
};
