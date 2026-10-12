import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { getEnv } from '@/config/env';

const PANJANG_IV = 12;
const PANJANG_TAG = 16;

let kunciCached: Buffer | undefined;

function kunci(): Buffer {
  kunciCached ??= Buffer.from(getEnv().NIK_ENCRYPTION_KEY, 'base64');
  return kunciCached;
}

/**
 * Mengenkripsi NIK dengan AES-256-GCM (DATABASE §10, DECISIONS 014). Format hasil:
 * `iv(12) || ciphertext || tag(16)`. IV acak per nilai sehingga NIK sama tidak menghasilkan
 * ciphertext sama.
 */
export function enkripsiNik(nik: string, kunciEnkripsi: Buffer = kunci()): Buffer {
  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv('aes-256-gcm', kunciEnkripsi, iv);
  const isi = Buffer.concat([cipher.update(nik, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, isi, cipher.getAuthTag()]);
}

/**
 * Dekripsi NIK. Hanya boleh dipanggil oleh layanan pemenang (lihat NIK kandidat, berlog audit)
 * dan tes. Melempar error bila data atau kunci tidak cocok (tag GCM gagal).
 */
export function dekripsiNik(data: Uint8Array, kunciEnkripsi: Buffer = kunci()): string {
  const buffer = Buffer.from(data);
  const iv = buffer.subarray(0, PANJANG_IV);
  const tag = buffer.subarray(buffer.length - PANJANG_TAG);
  const isi = buffer.subarray(PANJANG_IV, buffer.length - PANJANG_TAG);
  const decipher = createDecipheriv('aes-256-gcm', kunciEnkripsi, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(isi), decipher.final()]).toString('utf8');
}
