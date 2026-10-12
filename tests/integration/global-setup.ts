import { execFileSync } from 'node:child_process';

import { Client } from 'pg';

import { URL_DB_TES } from '../support/env-tes.mts';

/**
 * Menyiapkan DB tes dari nol sekali per run (TESTING §3): skema `public` dibuang dan seluruh
 * migrasi diterapkan ulang, sehingga tes berjalan di DB hasil migrasi sungguhan.
 */
export default async function setup(): Promise<void> {
  const klien = new Client({ connectionString: URL_DB_TES });
  try {
    await klien.connect();
  } catch (error) {
    throw new Error(
      'PostgreSQL tes tidak dapat dihubungi. Jalankan `npm run db:test:up` lebih dulu.',
      { cause: error },
    );
  }
  try {
    await klien.query('DROP SCHEMA IF EXISTS public CASCADE');
    await klien.query('CREATE SCHEMA public');
  } finally {
    await klien.end();
  }

  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: URL_DB_TES },
    stdio: 'pipe',
  });
}
