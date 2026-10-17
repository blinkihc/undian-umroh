import { z } from 'zod';

import { isTanggalKalender } from './waktu';

/**
 * Kode aksi audit yang baku (docs/OBSERVABILITY.md, bagian Audit Log).
 * Satu sumber kebenaran untuk penulis audit di server dan filter di antarmuka.
 */
export const AKSI_AUDIT = [
  // Autentikasi
  'LOGIN_BERHASIL',
  'LOGIN_GAGAL',
  'LOGIN_DIBLOKIR',
  'LOGOUT',
  'PASSWORD_GANTI',
  // Pengguna
  'PENGGUNA_BUAT',
  'PENGGUNA_UBAH',
  'PENGGUNA_AKTIFKAN',
  'PENGGUNA_NONAKTIFKAN',
  'PENGGUNA_RESET_PASSWORD',
  // Periode
  'PERIODE_BUAT',
  'PERIODE_UBAH',
  'PERIODE_BATAL',
  'PERIODE_KUNCI',
  'PERIODE_BUKA_KUNCI',
  'PERIODE_PUBLIKASI',
  'PERIODE_HAPUS',
  // Data
  'IMPOR_BERHASIL',
  'IMPOR_DITOLAK',
  'PESERTA_GUGUR',
  'WILAYAH_PETAKAN',
  'WILAYAH_NAMA_UBAH',
  // Paket dan hasil
  'PAKET_UNDUH',
  'HASIL_UNGGAH',
  'HASIL_DITOLAK',
  'HASIL_BATAL',
  // Pemenang
  'PEMENANG_VERIFIKASI',
  'PEMENANG_GUGUR',
  'PEMENANG_LIHAT_NIK',
  // Tema
  'TEMA_BUAT',
  'TEMA_UBAH',
  'TEMA_HAPUS',
  'TEMA_PERIODE_PILIH',
  'ASET_UNGGAH',
  'ASET_HAPUS',
  'AI_PROMPT',
  // Dokumen
  'BERITA_ACARA_UBAH',
  'BERITA_ACARA_UNDUH',
  'EKSPOR_UNDUH',
  // Keamanan
  'AKSES_DITOLAK',
  'RATE_LIMIT_TERLEWATI',
  // Sistem
  'SISTEM_ANONIMISASI',
] as const;

export type AksiAudit = (typeof AKSI_AUDIT)[number];

/** Ukuran halaman log audit (API.md §1: bawaan 50, maksimal 200). */
export const UKURAN_HALAMAN_BAWAAN = 50;
export const UKURAN_HALAMAN_MAKS = 200;

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Isian kosong dianggap tidak difilter (form GET mengirim string kosong untuk field kosong). */
function kosongJadiTanpaNilai(nilai: unknown): unknown {
  return nilai === '' ? undefined : nilai;
}

const tanggal = z
  .string()
  .regex(POLA_TANGGAL, 'Tanggal harus berformat YYYY-MM-DD.')
  .refine(isTanggalKalender, 'Tanggal tidak dikenali.');

/**
 * Filter `GET /api/audit` dan halaman Log Audit (UX_FLOWS Flow 16): aksi, aktor, rentang tanggal
 * WIB inklusif, dan paginasi.
 */
export const FilterAuditSchema = z
  .strictObject({
    aksi: z.preprocess(
      kosongJadiTanpaNilai,
      z.enum(AKSI_AUDIT, { error: 'Kode aksi tidak dikenal.' }).optional(),
    ),
    aktor: z.preprocess(
      kosongJadiTanpaNilai,
      z.string().trim().toLowerCase().max(64, 'Aktor maksimal 64 karakter.').optional(),
    ),
    dari: z.preprocess(kosongJadiTanpaNilai, tanggal.optional()),
    sampai: z.preprocess(kosongJadiTanpaNilai, tanggal.optional()),
    page: z.preprocess(
      kosongJadiTanpaNilai,
      z.coerce.number().int().min(1, 'Halaman minimal 1.').default(1),
    ),
    pageSize: z.preprocess(
      kosongJadiTanpaNilai,
      z.coerce
        .number()
        .int()
        .min(1, 'Ukuran halaman minimal 1.')
        .max(UKURAN_HALAMAN_MAKS, `Ukuran halaman maksimal ${UKURAN_HALAMAN_MAKS.toString()}.`)
        .default(UKURAN_HALAMAN_BAWAAN),
    ),
  })
  .refine(
    (filter) =>
      filter.dari === undefined || filter.sampai === undefined || filter.dari <= filter.sampai,
    { message: 'Tanggal akhir tidak boleh sebelum tanggal awal.', path: ['sampai'] },
  );

export type FilterAudit = z.infer<typeof FilterAuditSchema>;

/**
 * Nama field yang tidak boleh tersimpan di payload audit (DATABASE §9, SECURITY §7). Dicocokkan
 * tanpa memandang huruf besar-kecil, pada nama field yang mengandung salah satu kata ini.
 */
const KATA_RAHASIA = ['password', 'sandi', 'token', 'secret', 'apikey', 'captcha', 'cookie', 'nik'];

function namaRahasia(nama: string): boolean {
  const kecil = nama.toLowerCase();
  return KATA_RAHASIA.some((kata) => kecil.includes(kata));
}

/** Nilai teks yang tampak seperti NIK (16 digit) atau NOP (18 digit) utuh. */
const POLA_NOMOR_UTUH = /\b\d{16}(\d{2})?\b/;

/**
 * Menyaring payload audit: field rahasia dibuang dan teks berisi 16/18 digit utuh disamarkan,
 * sampai kedalaman berapa pun. Lapisan pengaman terakhir; pemanggil tetap wajib hanya menulis
 * ringkasan dan ID.
 */
export function bersihkanPayloadAudit(nilai: unknown): unknown {
  if (Array.isArray(nilai)) {
    return nilai.map(bersihkanPayloadAudit);
  }
  if (typeof nilai === 'string') {
    return POLA_NOMOR_UTUH.test(nilai) ? '[DISAMARKAN]' : nilai;
  }
  if (nilai !== null && typeof nilai === 'object') {
    const hasil: Record<string, unknown> = {};
    for (const [kunci, isi] of Object.entries(nilai)) {
      if (!namaRahasia(kunci)) {
        hasil[kunci] = bersihkanPayloadAudit(isi);
      }
    }
    return hasil;
  }
  return nilai;
}
