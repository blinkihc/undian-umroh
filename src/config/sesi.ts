/**
 * Konstanta sesi (docs/SECURITY.md §1). Sengaja tanpa 'server-only' dan tanpa dependensi server
 * supaya `src/proxy.ts` dan kode server memakai angka yang sama.
 */

/** Masa berlaku cookie dan token sesi: 8 jam. */
export const MASA_SESI_DETIK = 8 * 60 * 60;

/** Perpanjangan bergulir tidak boleh melewati 12 jam sejak login (dicek server di setiap request). */
export const BATAS_SESI_MUTLAK_MS = 12 * 60 * 60 * 1000;

/** Cookie diperbarui paling cepat setiap 15 menit aktivitas agar tidak ditulis ulang tiap request. */
export const INTERVAL_PERPANJANG_DETIK = 15 * 60;

const NAMA_COOKIE_DASAR = 'authjs.session-token';

/** Cookie `Secure` dipakai bila aplikasi dilayani lewat HTTPS (produksi di balik Caddy). */
export function isCookieAman(appUrl: string): boolean {
  return appUrl.startsWith('https://');
}

/** Nama cookie sesi Auth.js; awalan `__Secure-` ditambahkan Auth.js saat HTTPS. */
export function namaCookieSesi(appUrl: string): string {
  return isCookieAman(appUrl) ? `__Secure-${NAMA_COOKIE_DASAR}` : NAMA_COOKIE_DASAR;
}
