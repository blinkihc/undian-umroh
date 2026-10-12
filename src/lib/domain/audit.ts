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
  'PERIODE_PUBLIKASI',
  // Data
  'IMPOR_BERHASIL',
  'IMPOR_DITOLAK',
  'WILAYAH_PETAKAN',
  'WILAYAH_NAMA_UBAH',
  // Paket dan hasil
  'PAKET_UNDUH',
  'HASIL_UNGGAH',
  'HASIL_DITOLAK',
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
