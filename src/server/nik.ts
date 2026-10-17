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
export function enkripsiNik(
  nik: string,
  kunciEnkripsi: Buffer = kunci(),
  vektorIn?: Buffer,
): Buffer {
  const iv = vektorIn ?? randomBytes(PANJANG_IV);
  const cipher = createCipheriv('aes-256-gcm', kunciEnkripsi, iv);
  const isi = cipher.update(nik, 'utf8');
  cipher.final();
  const tag = cipher.getAuthTag();
  const hasil = Buffer.allocUnsafe(PANJANG_IV + isi.length + PANJANG_TAG);
  iv.copy(hasil, 0);
  isi.copy(hasil, PANJANG_IV);
  tag.copy(hasil, PANJANG_IV + isi.length);
  return hasil;
}

/**
 * Mengenkripsi banyak NIK dalam batch efisien (mengurangi churn garbage collection randomBytes).
 */
export function enkripsiBanyakNik(
  daftarNik: string[],
  kunciEnkripsi: Buffer = kunci(),
): (Uint8Array | null)[] {
  const hasil: (Uint8Array | null)[] = new Array(daftarNik.length);
  const indeksValid: number[] = [];

  for (let i = 0; i < daftarNik.length; i++) {
    const n = daftarNik[i];
    if (n !== undefined && n !== '') {
      indeksValid.push(i);
    } else {
      hasil[i] = null;
    }
  }

  const UKURAN_POOL = 10_000;
  for (let b = 0; b < indeksValid.length; b += UKURAN_POOL) {
    const chunk = indeksValid.slice(b, b + UKURAN_POOL);
    const poolIv = randomBytes(PANJANG_IV * chunk.length);

    for (let j = 0; j < chunk.length; j++) {
      const idx = chunk[j]!;
      const iv = poolIv.subarray(j * PANJANG_IV, (j + 1) * PANJANG_IV);
      const enc = enkripsiNik(daftarNik[idx]!, kunciEnkripsi, iv);
      hasil[idx] = new Uint8Array(enc);
    }
  }

  return hasil;
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
