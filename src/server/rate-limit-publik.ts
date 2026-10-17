import 'server-only';

import { audit } from '@/server/audit';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { getLogger } from '@/server/logger';
import { hashIpHarian, type KonteksRequest } from '@/server/request';

// Ambang batas rate limiting publik (SECURITY §5, Tiket 22)
export const JENDELA_CEK_NOP_MS = 10 * 60 * 1000; // 10 menit
export const AMBANG_CAPTCHA_CEK_NOP = 20; // >= 20 memicu captcha
export const BATAS_MAKS_CEK_NOP = 60; // > 60 memblokir 429

export const JENDELA_PEMENANG_MS = 60 * 1000; // 1 menit
export const BATAS_MAKS_PEMENANG = 120; // > 120 memblokir 429

type CatatanPermintaan = {
  waktu: number[];
};

const riwayatCekNop = new Map<string, CatatanPermintaan>();
const riwayatPemenang = new Map<string, CatatanPermintaan>();

function bersihkanRiwayatLama(peta: Map<string, CatatanPermintaan>, jendelaMs: number, sekarang: number): void {
  const batas = sekarang - jendelaMs;
  for (const [ip, data] of peta) {
    const sisa = data.waktu.filter((w) => w > batas);
    if (sisa.length === 0) {
      peta.delete(ip);
    } else {
      data.waktu = sisa;
    }
  }
}

/**
 * Memeriksa status rate limit untuk endpoint cek NOP publik.
 * Mengembalikan `{ butuhCaptcha: boolean }` atau melempar AppError 429 jika melebihi batas 60.
 */
export async function periksaRateLimitCekNop(
  ip: string,
  konteks?: KonteksRequest,
  sekarang: number = Date.now(),
): Promise<{ butuhCaptcha: boolean }> {
  if (riwayatCekNop.size >= 5000) {
    bersihkanRiwayatLama(riwayatCekNop, JENDELA_CEK_NOP_MS, sekarang);
  }

  const batas = sekarang - JENDELA_CEK_NOP_MS;
  const data = riwayatCekNop.get(ip) ?? { waktu: [] };
  const riwayatAktif = data.waktu.filter((w) => w > batas);
  const total = riwayatAktif.length;

  // Di atas 60 per 10 menit -> tolak keras dengan 429
  if (total >= BATAS_MAKS_CEK_NOP) {
    const tertua = riwayatAktif[0] ?? sekarang;
    const retryAfterDetik = Math.max(1, Math.ceil((tertua + JENDELA_CEK_NOP_MS - sekarang) / 1000));

    getLogger().warn({ ipHash: hashIpHarian(ip) }, 'Batas laju cek NOP terlewati');

    // Catat log audit RATE_LIMIT_TERLEWATI
    try {
      await audit(getDb(), {
        aksi: 'RATE_LIMIT_TERLEWATI',
        targetTipe: 'publik_cek',
        aktorLabel: 'publik',
        konteks,
        payload: { ipHash: hashIpHarian(ip), totalPermintaan: total },
      });
    } catch {
      // Jangan gagalkan alur jika DB audit bermasalah
    }

    throw new AppError(
      'TERLALU_BANYAK_PERMINTAAN',
      429,
      'Terlalu banyak pengecekan. Coba lagi beberapa menit lagi.',
      {
        retryAfterDetik,
        captchaDiperlukan: false,
      },
    );
  }

  // 20 sampai 60 per 10 menit -> wajib selesaikan captcha
  if (total >= AMBANG_CAPTCHA_CEK_NOP) {
    return { butuhCaptcha: true };
  }

  return { butuhCaptcha: false };
}

/**
 * Mencatat permintaan cek NOP yang berhasil diproses.
 */
export function catatPermintaanCekNop(ip: string, sekarang: number = Date.now()): void {
  const batas = sekarang - JENDELA_CEK_NOP_MS;
  const data = riwayatCekNop.get(ip) ?? { waktu: [] };
  const riwayatAktif = data.waktu.filter((w) => w > batas);
  riwayatAktif.push(sekarang);
  riwayatCekNop.set(ip, { waktu: riwayatAktif });
}

/**
 * Memeriksa status rate limit untuk endpoint pemenang publik (120 / menit).
 */
export async function periksaRateLimitPemenang(
  ip: string,
  konteks?: KonteksRequest,
  sekarang: number = Date.now(),
): Promise<void> {
  if (riwayatPemenang.size >= 5000) {
    bersihkanRiwayatLama(riwayatPemenang, JENDELA_PEMENANG_MS, sekarang);
  }

  const batas = sekarang - JENDELA_PEMENANG_MS;
  const data = riwayatPemenang.get(ip) ?? { waktu: [] };
  const riwayatAktif = data.waktu.filter((w) => w > batas);

  if (riwayatAktif.length >= BATAS_MAKS_PEMENANG) {
    const tertua = riwayatAktif[0] ?? sekarang;
    const retryAfterDetik = Math.max(1, Math.ceil((tertua + JENDELA_PEMENANG_MS - sekarang) / 1000));

    getLogger().warn({ ipHash: hashIpHarian(ip) }, 'Batas laju pemenang publik terlewati');

    try {
      await audit(getDb(), {
        aksi: 'RATE_LIMIT_TERLEWATI',
        targetTipe: 'publik_pemenang',
        aktorLabel: 'publik',
        konteks,
        payload: { ipHash: hashIpHarian(ip), totalPermintaan: riwayatAktif.length },
      });
    } catch {
      // ignore audit write error
    }

    throw new AppError(
      'TERLALU_BANYAK_PERMINTAAN',
      429,
      'Terlalu banyak permintaan. Coba beberapa saat lagi.',
      {
        retryAfterDetik,
      },
    );
  }

  riwayatAktif.push(sekarang);
  riwayatPemenang.set(ip, { waktu: riwayatAktif });
}

/** Reset semua riwayat rate limit publik (hanya untuk pengetesan). */
export function resetRateLimitPublik(): void {
  riwayatCekNop.clear();
  riwayatPemenang.clear();
}
