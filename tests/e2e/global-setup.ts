import { execFileSync } from 'node:child_process';

import { Client } from 'pg';

import { APP_URL_E2E, NAMA_DB_E2E, URL_DB_E2E, URL_DB_PEMELIHARAAN } from '../support/env-e2e';
import { buatPenggunaE2E } from './helpers/db';

/** Membuat database e2e baru dan menerapkan seluruh migrasi sebelum tes dimulai. */
export default async function globalSetup(): Promise<void> {
  const klien = new Client({ connectionString: URL_DB_PEMELIHARAAN });
  try {
    await klien.connect();
  } catch (error) {
    throw new Error(
      'PostgreSQL tes tidak dapat dihubungi. Jalankan `npm run db:test:up` lebih dulu.',
      { cause: error },
    );
  }
  try {
    await klien.query(`DROP DATABASE IF EXISTS ${NAMA_DB_E2E} WITH (FORCE)`);
    await klien.query(`CREATE DATABASE ${NAMA_DB_E2E}`);
  } finally {
    await klien.end();
  }

  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: URL_DB_E2E },
    stdio: 'pipe',
  });

  await hangatkanServer();
}

/**
 * Query pertama Prisma di server yang baru menyala memakan beberapa detik (memuat mesin query
 * dan membuka koneksi). Tanpa pemanasan, login pertama yang berjalan paralel melewati batas
 * waktu tunggu tes. Kegagalan di sini tidak fatal: Playwright memulai server sebelum langkah ini,
 * dan tes tetap berjalan, hanya mungkin lebih lambat di permintaan pertama.
 */
async function hangatkanServer(): Promise<void> {
  const cookieDari = (respons: Response): string =>
    respons.headers
      .getSetCookie()
      .map((baris) => baris.split(';')[0] ?? '')
      .join('; ');

  try {
    await fetch(`${APP_URL_E2E}/api/health`);

    // Login sungguhan lalu buka tiap halaman Panel agar modul server (Auth.js, argon2, Prisma)
    // sudah termuat sebelum tes pertama.
    const pengguna = await buatPenggunaE2E({ peran: 'ADMIN' });
    const csrf = await fetch(`${APP_URL_E2E}/api/auth/csrf`);
    const { csrfToken } = (await csrf.json()) as { csrfToken: string };
    const masuk = await fetch(`${APP_URL_E2E}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Auth-Return-Redirect': '1',
        Cookie: cookieDari(csrf),
        Origin: APP_URL_E2E,
      },
      body: new URLSearchParams({
        csrfToken,
        username: pengguna.username,
        password: pengguna.password,
        callbackUrl: '/login',
      }),
    });
    const cookie = cookieDari(masuk);
    for (const jalur of ['/login', '/admin', '/operator', '/akun/ganti-password']) {
      await fetch(`${APP_URL_E2E}${jalur}`, { headers: { Cookie: cookie }, redirect: 'manual' });
    }
  } catch (error) {
    // Tidak fatal: tes pertama yang menanggung waktu pemanasan, tetapi tetap perlu terlihat.
    console.warn('Pemanasan server e2e gagal:', error);
  }
}
