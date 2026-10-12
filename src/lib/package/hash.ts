/**
 * Modul murni untuk hash kanonik dan formatting sidik digital (API.md §4.1).
 * Dipakai bersama oleh server dan browser offline (ARCHITECTURE §8, DECISIONS 010).
 */

/**
 * Serialisasi JSON kanonik (API.md §4.1):
 * - Kunci objek diurutkan leksikografis (UTF-16 code unit) secara rekursif
 * - Urutan array dipertahankan
 * - Tanpa spasi / indentasi
 * - Angka hanya bilangan bulat (integer), tolak non-integer / float
 * - String UTF-8 apa adanya tanpa normalisasi Unicode tambahan
 * - Properti dengan nilai undefined diabaikan
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(`canonicalStringify hanya menerima bilangan bulat: ${String(value)}`);
    }
    return value.toString();
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const elemen = value.map((v) => (v === undefined ? 'null' : canonicalStringify(v)));
    return `[${elemen.join(',')}]`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const kunciTerurut = Object.keys(obj).sort();
    const pasangan: string[] = [];
    for (const k of kunciTerurut) {
      const v = obj[k];
      if (v !== undefined) {
        pasangan.push(`${JSON.stringify(k)}:${canonicalStringify(v)}`);
      }
    }
    return `{${pasangan.join(',')}}`;
  }
  throw new TypeError(`Tipe tidak didukung canonicalStringify: ${typeof value}`);
}

/**
 * SHA-256 dari teks atau buffer byte UTF-8, menghasilkan 64 hex huruf kecil.
 * Memakai Web Crypto API (globalThis.crypto.subtle) yang didukung di Node dan peramban modern.
 */
export async function sha256Hex(teks: string | Uint8Array): Promise<string> {
  const bytes = typeof teks === 'string' ? new TextEncoder().encode(teks) : teks;
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  const arr = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Format ringkas untuk saksi: 8 karakter awal + '…' + 8 karakter akhir huruf besar (API.md §4.1).
 * Contoh: `3F9A1C0B…D27E44A1`.
 */
export function formatHashRingkas(hash: string): string {
  if (hash.length <= 16) return hash.toUpperCase();
  const awal = hash.slice(0, 8).toUpperCase();
  const akhir = hash.slice(-8).toUpperCase();
  return `${awal}…${akhir}`;
}
