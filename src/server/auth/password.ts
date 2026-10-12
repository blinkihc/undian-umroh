import 'server-only';

import { hash, verify } from '@node-rs/argon2';

/**
 * Parameter argon2id minimum OWASP (SECURITY §1): memori 19 MiB, 2 iterasi, 1 paralelisme.
 * Algoritma tidak ditulis karena bawaan pustaka sudah Argon2id.
 */
const OPSI_ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPSI_ARGON2);
}

/** Salah format hash dianggap tidak cocok, bukan error, agar login tetap gagal secara generik. */
export async function verifyPassword(hashTersimpan: string, password: string): Promise<boolean> {
  try {
    return await verify(hashTersimpan, password);
  } catch {
    return false;
  }
}

let hashPalsu: Promise<string> | undefined;

/**
 * Memverifikasi terhadap hash palsu agar waktu respons username tak dikenal sama dengan
 * kata sandi salah (mencegah enumerasi username lewat waktu).
 */
export async function verifyPasswordPalsu(password: string): Promise<void> {
  hashPalsu ??= hashPassword('kata-sandi-palsu-untuk-menyamakan-waktu');
  await verifyPassword(await hashPalsu, password);
}
