import 'server-only';

import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

import { ulid } from 'ulid';

import { getEnv } from '@/config/env';

/** Asal request yang dicatat di audit (IP mentah hanya boleh di audit_log, OBSERVABILITY). */
export type KonteksRequest = {
  ip: string | null;
  userAgent: string | null;
};

const UKURAN_USER_AGENT_MAKS = 256;

/** ID korelasi log: `req_<ulid>` (OBSERVABILITY). */
export function buatRequestId(): string {
  return `req_${ulid()}`;
}

/**
 * IP klien dari X-Forwarded-For. Hanya proxy tepercaya tunggal (Caddy) yang menambah header ini,
 * jadi yang dipercaya adalah entri paling kanan (SECURITY §5). Nilai bukan IP dianggap tidak ada.
 */
export function ambilIpKlien(headers: Headers): string | null {
  const daftar = headers.get('x-forwarded-for');
  if (daftar === null) {
    return null;
  }
  const terakhir = daftar.split(',').at(-1)?.trim() ?? '';
  return isIP(terakhir) === 0 ? null : terakhir;
}

export function ambilKonteks(headers: Headers): KonteksRequest {
  const userAgent = headers.get('user-agent');
  return {
    ip: ambilIpKlien(headers),
    userAgent: userAgent === null ? null : userAgent.slice(0, UKURAN_USER_AGENT_MAKS),
  };
}

/** IP untuk log aplikasi: hash harian, bukan IP mentah (OBSERVABILITY). */
export function hashIpHarian(ip: string | null, sekarang: Date = new Date()): string {
  if (ip === null) {
    return '-';
  }
  const hari = sekarang.toISOString().slice(0, 10);
  return createHmac('sha256', getEnv().AUTH_SECRET)
    .update(`${hari}|${ip}`)
    .digest('hex')
    .slice(0, 16);
}
