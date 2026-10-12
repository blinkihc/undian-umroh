import 'server-only';

import Papa from 'papaparse';

import { AppError } from '@/server/errors';

export const PESAN_TIDAK_TERBACA = 'File tidak dapat dibaca. Simpan ulang sebagai CSV UTF-8.';

/**
 * Membaca CSV ekspor PBB: UTF-8 (BOM dibuang), pemisah `;`, semua sel sebagai teks. Baris yang
 * seluruhnya kosong dilewati. Byte NUL berarti file biner, bukan CSV (SECURITY §8).
 * Dukungan Windows-1252 dan XLSX ditambahkan di tiket 07.
 */
export function bacaCsv(bytes: Uint8Array): { header: string[]; baris: string[][] } {
  if (bytes.includes(0)) {
    throw new AppError('FILE_TIDAK_VALID', 400, PESAN_TIDAK_TERBACA);
  }
  let teks: string;
  try {
    teks = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new AppError('FILE_TIDAK_VALID', 400, PESAN_TIDAK_TERBACA);
  }
  const hasil = Papa.parse<string[]>(teks.replace(/^\uFEFF/, ''), {
    delimiter: ';',
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });
  const [header, ...baris] = hasil.data;
  if (header === undefined) {
    throw new AppError('FILE_TIDAK_VALID', 400, 'File tidak berisi data peserta.');
  }
  return { header, baris };
}
