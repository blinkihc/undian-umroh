import 'server-only';

/**
 * Kode error API yang stabil (docs/API.md §1.1, docs/ERROR_HANDLING.md).
 * Tiket berikutnya menambah kode di sini, bukan di tempat lain.
 */
export type KodeError =
  | 'VALIDASI_GAGAL'
  | 'TIDAK_TERAUTENTIKASI'
  | 'AKSES_DITOLAK'
  | 'PASSWORD_HARUS_DIGANTI'
  | 'TIDAK_DITEMUKAN'
  | 'CONFLICT'
  | 'USERNAME_SUDAH_DIPAKAI'
  | 'PERUBAHAN_AKUN_DITOLAK'
  | 'PERIODE_AKTIF_SUDAH_ADA'
  | 'PERIODE_TERKUNCI'
  | 'HEADER_TIDAK_SESUAI'
  | 'FILE_TIDAK_VALID'
  | 'TERLALU_BANYAK_PERMINTAAN'
  | 'FILE_TERLALU_BESAR'
  | 'PRASYARAT_KUNCI_BELUM_LENGKAP'
  | 'PERIODE_BELUM_TERKUNCI'
  | 'PERIODE_BUKAN_TERKUNCI'
  | 'FILE_TIDAK_DITEMUKAN'
  | 'INTEGRITAS_RUSAK'
  | 'UKURAN_MELEBIHI_BATAS'
  | 'HASIL_SUDAH_DIUNGGAH'
  | 'HASIL_TIDAK_VALID'
  | 'SLOT_TIDAK_VALID'
  | 'AKSI_TIDAK_VALID'
  | 'KESALAHAN_SERVER'
  | 'LAYANAN_TIDAK_TERSEDIA';

/** Kegagalan yang diharapkan di service; dipetakan ke format error API oleh `withHandler`. */
export class AppError extends Error {
  readonly code: KodeError;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: KodeError, status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Galat validasi per field: `details.fields` berisi pesan Indonesia per nama field. */
export function galatValidasi(
  fields: Record<string, string>,
  pesan = 'Data tidak valid.',
): AppError {
  return new AppError('VALIDASI_GAGAL', 400, pesan, { fields });
}
