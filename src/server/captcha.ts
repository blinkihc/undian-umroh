import 'server-only';

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { getEnv } from '@/config/env';
import { type SolusiCaptcha, type TantanganCaptcha } from '@/lib/captcha';
import { AppError } from '@/server/errors';

export const TARGET_CAPTCHA_DEFAULT = '0000';
export const DURASI_KADALUARSA_MS = 5 * 60 * 1000; // 5 menit

// Penyimpanan salt terpakai di memori untuk mencegah replay attack (single-use)
const saltTerpakai = new Map<string, number>();

function bersihkanSaltKadaluarsa(sekarang: number): void {
  for (const [salt, exp] of saltTerpakai) {
    if (exp <= sekarang) {
      saltTerpakai.delete(salt);
    }
  }
}

/**
 * Membuat tantangan Captcha Proof-of-Work yang ditandatangani HMAC (DECISIONS 020).
 * Kedaluwarsa 5 menit, hanya berlaku sekali.
 */
export function buatTantanganCaptcha(target: string = TARGET_CAPTCHA_DEFAULT): TantanganCaptcha {
  const salt = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + DURASI_KADALUARSA_MS).toISOString();
  const key = Buffer.from(getEnv().CAPTCHA_HMAC_KEY, 'base64');

  const signature = createHmac('sha256', key)
    .update(`${salt}:${target}:${expiresAt}`)
    .digest('hex');

  return {
    salt,
    target,
    expiresAt,
    signature,
  };
}

/**
 * Memverifikasi solusi Captcha Proof-of-Work.
 * Melempar AppError jika kedaluwarsa, tanda tangan salah, sudah dipakai, atau PoW salah.
 */
export function verifikasiCaptcha(
  solusi: SolusiCaptcha,
  target: string = TARGET_CAPTCHA_DEFAULT,
): void {
  const sekarang = Date.now();
  const exp = Date.parse(solusi.expiresAt);

  if (Number.isNaN(exp) || sekarang > exp) {
    throw new AppError('VALIDASI_GAGAL', 400, 'Tantangan captcha sudah kedaluwarsa.');
  }

  // Perlindungan replay: salt hanya boleh dipakai satu kali
  if (saltTerpakai.has(solusi.salt)) {
    throw new AppError('VALIDASI_GAGAL', 400, 'Tantangan captcha sudah pernah dipakai.');
  }

  const key = Buffer.from(getEnv().CAPTCHA_HMAC_KEY, 'base64');
  const expectedSignature = createHmac('sha256', key)
    .update(`${solusi.salt}:${target}:${solusi.expiresAt}`)
    .digest('hex');

  if (
    solusi.signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(solusi.signature), Buffer.from(expectedSignature))
  ) {
    throw new AppError('VALIDASI_GAGAL', 400, 'Tanda tangan captcha tidak sah.');
  }

  // Verifikasi hash proof-of-work: sha256Hex(salt:nonce) harus berawalan target
  const hash = createHash('sha256')
    .update(`${solusi.salt}:${solusi.nonce}`)
    .digest('hex');

  if (!hash.startsWith(target)) {
    throw new AppError('VALIDASI_GAGAL', 400, 'Solusi proof-of-work captcha tidak valid.');
  }

  // Catat salt sebagai terpakai
  if (saltTerpakai.size >= 10_000) {
    bersihkanSaltKadaluarsa(sekarang);
  }
  saltTerpakai.set(solusi.salt, exp);
}

/** Reset salt terpakai (hanya untuk pengetesan). */
export function resetSaltTerpakai(): void {
  saltTerpakai.clear();
}
