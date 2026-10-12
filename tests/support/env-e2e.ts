/**
 * Konfigurasi bersama untuk Playwright: database e2e terpisah dari database tes integrasi
 * (`undian_test`) supaya kedua suite tidak saling mengganggu, tetapi memakai server PostgreSQL
 * yang sama dari docker-compose.test.yml (`npm run db:test:up`).
 */

const SERVER_DB_TES =
  process.env.DATABASE_URL_TEST ?? 'postgresql://undian:undian@localhost:5433/undian_test';

/** Mengganti nama database pada URL koneksi PostgreSQL. */
function urlDengan(namaDb: string): string {
  const url = new URL(SERVER_DB_TES);
  url.pathname = `/${namaDb}`;
  url.search = '';
  return url.toString();
}

export const NAMA_DB_E2E = 'undian_e2e';

/** Koneksi aplikasi saat e2e. */
export const URL_DB_E2E = `${urlDengan(NAMA_DB_E2E)}?schema=public`;

/** Koneksi ke database pemeliharaan untuk membuat dan membuang database e2e. */
export const URL_DB_PEMELIHARAAN = urlDengan('postgres');

export const PORT_E2E = '3100';
export const APP_URL_E2E = `http://localhost:${PORT_E2E}`;

export const PASSWORD_E2E = 'kata-sandi-e2e-12345';
