import { z } from 'zod';

import { type Result } from './result';
import { isTanggalKalender } from './waktu';

/** Status periode (DATABASE §3, DECISIONS 016). Urutan = urutan siklus hidup. */
export const STATUS_PERIODE = [
  'DRAF',
  'TERKUNCI',
  'DIUNDI',
  'FINAL',
  'DIPUBLIKASI',
  'DIBATALKAN',
] as const;

export type StatusPeriode = (typeof STATUS_PERIODE)[number];

export const LABEL_STATUS_PERIODE: Record<StatusPeriode, string> = {
  DRAF: 'Draf',
  TERKUNCI: 'Terkunci',
  DIUNDI: 'Diundi',
  FINAL: 'Final',
  DIPUBLIKASI: 'Dipublikasi',
  DIBATALKAN: 'Dibatalkan',
};

export const KODE_WILAYAH = ['W1', 'W2'] as const;

export type KodeWilayah = (typeof KODE_WILAYAH)[number];

export const NAMA_WILAYAH_BAWAAN: Record<KodeWilayah, string> = {
  W1: 'Wilayah 1',
  W2: 'Wilayah 2',
};

export const JUDUL_PERIODE_BAWAAN = 'Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026';

/** Tahun pajak yang wajib lunas; tetap 2022–2026 (PRD §6.0, kolom impor di-hardcode). */
export const TAHUN_PAJAK = { awal: 2022, akhir: 2026 } as const;

/** Batas pelunasan bawaan, inklusif (DECISIONS 005). */
export const BATAS_LUNAS_BAWAAN = '2026-09-30T23:59:59+07:00';

/** Jam batas yang dipakai form saat admin memilih tanggal saja: akhir hari WIB. */
export const JAM_BATAS_LUNAS = 'T23:59:59+07:00';

const BATAS_LUNAS_PALING_AWAL = new Date('2026-01-01T00:00:00+07:00');

/** Periode aktif = belum Dipublikasi dan belum Dibatalkan; hanya boleh ada satu (PRD A4). */
export function isPeriodeAktif(status: StatusPeriode): boolean {
  return status !== 'DIPUBLIKASI' && status !== 'DIBATALKAN';
}

/** Status yang masih mengizinkan perubahan judul, tanggal & lokasi acara, dan nama wilayah. */
const STATUS_BOLEH_UBAH_INFO: readonly StatusPeriode[] = ['DRAF', 'TERKUNCI', 'DIUNDI', 'FINAL'];

/** Status yang boleh dibatalkan: belum ada hasil undian (DECISIONS 016). */
const STATUS_BOLEH_BATAL: readonly StatusPeriode[] = ['DRAF', 'TERKUNCI'];

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

const judul = z
  .string({ error: 'Judul wajib diisi.' })
  .trim()
  .min(5, 'Judul minimal 5 karakter.')
  .max(150, 'Judul maksimal 150 karakter.');

const batasLunas = z
  .string({ error: 'Tanggal batas wajib diisi.' })
  .pipe(
    z.iso.datetime({
      offset: true,
      error: 'Tanggal batas harus berformat ISO 8601 dengan zona waktu.',
    }),
  )
  .refine(
    (nilai) => new Date(nilai) >= BATAS_LUNAS_PALING_AWAL,
    'Tanggal batas tidak boleh sebelum 1 Januari 2026.',
  );

const tanggalAcara = z
  .string()
  .regex(POLA_TANGGAL, 'Tanggal acara harus berformat YYYY-MM-DD.')
  .refine(isTanggalKalender, 'Tanggal acara tidak dikenali.')
  .nullable();

/** Lokasi kosong disimpan sebagai null. */
const lokasiAcara = z
  .string()
  .trim()
  .max(150, 'Lokasi acara maksimal 150 karakter.')
  .transform((nilai) => (nilai === '' ? null : nilai))
  .nullable();

const namaWilayah = z
  .string({ error: 'Nama wilayah wajib diisi.' })
  .trim()
  .min(1, 'Nama wilayah wajib diisi.')
  .max(50, 'Nama wilayah maksimal 50 karakter.');

const daftarNamaWilayah = z.strictObject({
  W1: namaWilayah.optional(),
  W2: namaWilayah.optional(),
});

const version = z.int().min(1);

/** Masukan `POST /api/periode` (API.md, Periode). Nama wilayah kosong memakai nama bawaan. */
export const BuatPeriodeSchema = z.strictObject({
  judul,
  batasLunas,
  tanggalAcara: tanggalAcara.optional(),
  lokasiAcara: lokasiAcara.optional(),
  namaWilayah: daftarNamaWilayah.optional(),
});

export type BuatPeriode = z.infer<typeof BuatPeriodeSchema>;

/** Masukan `PATCH /api/periode/:id`: semua opsional kecuali `version`, minimal satu perubahan. */
export const UbahPeriodeSchema = z
  .strictObject({
    version,
    judul: judul.optional(),
    batasLunas: batasLunas.optional(),
    tanggalAcara: tanggalAcara.optional(),
    lokasiAcara: lokasiAcara.optional(),
    namaWilayah: daftarNamaWilayah.optional(),
  })
  .refine((isi) => Object.keys(isi).some((kunci) => kunci !== 'version'), {
    message: 'Kirim minimal satu perubahan beserta version.',
  });

export type UbahPeriode = z.infer<typeof UbahPeriodeSchema>;

/** Masukan `POST /api/periode/:id/batal`. */
export const BatalPeriodeSchema = z.strictObject({
  version,
  alasan: z
    .string({ error: 'Alasan pembatalan wajib diisi.' })
    .trim()
    .min(10, 'Alasan pembatalan minimal 10 karakter.')
    .max(500, 'Alasan pembatalan maksimal 500 karakter.'),
});

export type BatalPeriode = z.infer<typeof BatalPeriodeSchema>;

export type AlasanPeriodeDitolak =
  | 'BATAS_HANYA_DRAF'
  | 'PERIODE_SUDAH_DIPUBLIKASI'
  | 'PERIODE_SUDAH_DIBATALKAN'
  | 'PERIODE_SUDAH_DIUNDI';

export const PESAN_PERIODE_DITOLAK: Record<AlasanPeriodeDitolak, string> = {
  BATAS_HANYA_DRAF: 'Periode sudah terkunci. Tanggal batas hanya dapat diubah saat status Draf.',
  PERIODE_SUDAH_DIPUBLIKASI: 'Periode sudah dipublikasikan. Data tidak dapat diubah.',
  PERIODE_SUDAH_DIBATALKAN: 'Periode sudah dibatalkan. Data tidak dapat diubah.',
  PERIODE_SUDAH_DIUNDI: 'Periode yang sudah memiliki hasil undian tidak dapat dibatalkan.',
};

function ditolakKarenaFinal(status: StatusPeriode): AlasanPeriodeDitolak {
  return status === 'DIBATALKAN' ? 'PERIODE_SUDAH_DIBATALKAN' : 'PERIODE_SUDAH_DIPUBLIKASI';
}

/**
 * Aturan ubah periode (API.md PATCH /api/periode/:id): tanggal batas hanya saat Draf karena
 * mengubah kepesertaan (DECISIONS 005); judul, acara, dan nama wilayah boleh sampai Final.
 */
export function periksaUbahPeriode(
  status: StatusPeriode,
  perubahan: { batasLunas?: unknown },
): Result<true, AlasanPeriodeDitolak> {
  if (!STATUS_BOLEH_UBAH_INFO.includes(status)) {
    return { ok: false, error: ditolakKarenaFinal(status) };
  }
  if (perubahan.batasLunas !== undefined && status !== 'DRAF') {
    return { ok: false, error: 'BATAS_HANYA_DRAF' };
  }
  return { ok: true, value: true };
}

/** Aturan batal (DECISIONS 016): hanya Draf atau Terkunci; Dibatalkan bersifat final. */
export function periksaBatalPeriode(status: StatusPeriode): Result<true, AlasanPeriodeDitolak> {
  if (STATUS_BOLEH_BATAL.includes(status)) {
    return { ok: true, value: true };
  }
  if (status === 'DIBATALKAN' || status === 'DIPUBLIKASI') {
    return { ok: false, error: ditolakKarenaFinal(status) };
  }
  return { ok: false, error: 'PERIODE_SUDAH_DIUNDI' };
}

/**
 * Slug periode, mis. `undian-umroh-2026` (DATABASE §3). Bila sudah dipakai periode lain
 * (mis. periode yang dibatalkan), diberi akhiran `-2`, `-3`, dan seterusnya. Slug tidak ikut
 * berubah saat judul diubah karena dipakai di nama file paket.
 */
export function buatSlugPeriode(tahunAkhir: number, terpakai: readonly string[]): string {
  const dasar = `undian-umroh-${tahunAkhir.toString()}`;
  const sudah = new Set(terpakai);
  if (!sudah.has(dasar)) {
    return dasar;
  }
  let urutan = 2;
  while (sudah.has(`${dasar}-${urutan.toString()}`)) {
    urutan += 1;
  }
  return `${dasar}-${urutan.toString()}`;
}
