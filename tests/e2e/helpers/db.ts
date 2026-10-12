import { randomBytes } from 'node:crypto';

import { hash } from '@node-rs/argon2';
import { Client } from 'pg';

import { PASSWORD_E2E, URL_DB_E2E } from '../../support/env-e2e';

export type PenggunaE2E = { username: string; password: string };

/**
 * Menyisipkan akun uji langsung ke database e2e (tanpa melewati kode aplikasi) dengan
 * username unik, sehingga pembatas login di memori server tidak saling memengaruhi antar tes.
 */
export async function buatPenggunaE2E(
  opsi: { peran?: 'ADMIN' | 'OPERATOR'; mustChangePassword?: boolean; nama?: string } = {},
): Promise<PenggunaE2E> {
  const username = `e2e-${randomBytes(5).toString('hex')}`;
  const klien = new Client({ connectionString: URL_DB_E2E });
  await klien.connect();
  try {
    await klien.query(
      `INSERT INTO pengguna (id, username, nama, password_hash, peran, must_change_password, updated_at)
       VALUES ($1, $2, $3, $4, $5::"Peran", $6, now())`,
      [
        `e2e${randomBytes(8).toString('hex')}`,
        username,
        opsi.nama ?? `Pengguna ${username}`,
        await hash(PASSWORD_E2E),
        opsi.peran ?? 'ADMIN',
        opsi.mustChangePassword ?? false,
      ],
    );
  } finally {
    await klien.end();
  }
  return { username, password: PASSWORD_E2E };
}

/**
 * Mengosongkan periode dan turunannya agar tes periode mulai dari keadaan kosong (aturan satu
 * periode aktif). Spesifikasi yang memakai helper ini berjalan serial.
 */
export async function kosongkanPeriode(): Promise<void> {
  const klien = new Client({ connectionString: URL_DB_E2E });
  await klien.connect();
  try {
    await klien.query('DELETE FROM peserta');
    await klien.query('DELETE FROM impor');
    await klien.query('DELETE FROM wilayah');
    await klien.query('DELETE FROM periode');
  } finally {
    await klien.end();
  }
}

/** Jumlah baris audit untuk satu aksi dan pelaku. */
export async function hitungAudit(aksi: string, aktorLabel: string): Promise<number> {
  const klien = new Client({ connectionString: URL_DB_E2E });
  await klien.connect();
  try {
    const hasil = await klien.query<{ jumlah: string }>(
      'SELECT count(*)::text AS jumlah FROM audit_log WHERE aksi = $1 AND aktor_label = $2',
      [aksi, aktorLabel],
    );
    return Number(hasil.rows[0]?.jumlah ?? 0);
  } finally {
    await klien.end();
  }
}
