import 'server-only';

import Papa from 'papaparse';

import { AppError } from '@/server/errors';

export const PESAN_TIDAK_TERBACA = 'File tidak dapat dibaca. Simpan ulang sebagai CSV UTF-8.';

/** Isi tabel mentah: baris header dan baris data, semua sel teks. */
export type IsiTabel = { header: string[]; baris: string[][] };

/** Karakter kendali C1: hasil Windows-1252 untuk byte yang tidak terdefinisi (0x81, 0x8D, …). */
const POLA_C1 = /[\u0080-\u009F]/;

/**
 * Mendekode teks CSV: UTF-8 dulu (BOM dibuang), bila gagal dicoba Windows-1252 (ekspor Excel
 * lama). Byte NUL, BOM UTF-16, atau byte yang tidak terdefinisi di Windows-1252 berarti file
 * tidak dapat dibaca (PRD F1, ERROR_HANDLING).
 */
export function dekodeCsv(bytes: Uint8Array): { teks: string; encoding: 'utf-8' | 'windows-1252' } {
  const utf16 =
    bytes.length >= 2 &&
    ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff));
  if (bytes.includes(0) || utf16) {
    throw new AppError('FILE_TIDAK_VALID', 400, PESAN_TIDAK_TERBACA);
  }
  try {
    const teks = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { teks: teks.replace(/^\uFEFF/, ''), encoding: 'utf-8' };
  } catch {
    const teks = new TextDecoder('windows-1252').decode(bytes);
    if (POLA_C1.test(teks)) {
      throw new AppError('FILE_TIDAK_VALID', 400, PESAN_TIDAK_TERBACA);
    }
    return { teks, encoding: 'windows-1252' };
  }
}

/**
 * Membaca CSV ekspor PBB: pemisah `;`, semua sel sebagai teks. Baris yang seluruhnya kosong
 * dilewati.
 */
export function bacaCsv(bytes: Uint8Array): IsiTabel {
  const { teks } = dekodeCsv(bytes);
  const hasil = Papa.parse<string[]>(teks, {
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
