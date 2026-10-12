import { type Result } from './result';
import { awalTahunWib, type GalatTanggal } from './tanggal-lunas';

/**
 * Tahun pajak yang kolomnya ada di file impor (PRD §6.0, kolom di-hardcode 2022–2026, sama
 * dengan `TAHUN_PAJAK`; dijaga tes unit).
 */
export const TAHUN_LUNAS = [2022, 2023, 2024, 2025, 2026] as const;

export type TahunLunas = (typeof TAHUN_LUNAS)[number];

type AlasanTahun =
  | `TANGGAL_KOSONG_${TahunLunas}`
  | `TANGGAL_TIDAK_DIKENALI_${TahunLunas}`
  | `TANGGAL_SEBELUM_TAHUN_PAJAK_${TahunLunas}`
  | `LEWAT_BATAS_${TahunLunas}`;

/** Kode alasan gugur yang baku di seluruh sistem (PRD §6.0). */
export type KodeAlasan =
  | 'NOP_INVALID'
  | 'NOP_DUPLICATE'
  | 'NAMA_KOSONG'
  | 'KECAMATAN_KOSONG'
  | 'FORMAT_BARIS'
  | AlasanTahun;

const ALASAN_UMUM = [
  'NOP_INVALID',
  'NOP_DUPLICATE',
  'NAMA_KOSONG',
  'KECAMATAN_KOSONG',
  'FORMAT_BARIS',
] as const satisfies readonly KodeAlasan[];

const JENIS_ALASAN_TAHUN = [
  'TANGGAL_KOSONG',
  'TANGGAL_TIDAK_DIKENALI',
  'TANGGAL_SEBELUM_TAHUN_PAJAK',
  'LEWAT_BATAS',
] as const;

function kodeTahun(jenis: (typeof JENIS_ALASAN_TAHUN)[number], tahun: TahunLunas): KodeAlasan {
  return `${jenis}_${tahun.toString()}` as KodeAlasan;
}

/** Semua kode alasan dalam urutan tampil: alasan umum, lalu per jenis dan tahun. */
export const KODE_ALASAN: readonly KodeAlasan[] = [
  ...ALASAN_UMUM,
  ...JENIS_ALASAN_TAHUN.flatMap((jenis) => TAHUN_LUNAS.map((tahun) => kodeTahun(jenis, tahun))),
];

const PESAN_UMUM: Record<(typeof ALASAN_UMUM)[number], string> = {
  NOP_INVALID: 'NOP tidak valid (harus 18 digit dan diawali 1609).',
  NOP_DUPLICATE: 'NOP muncul lebih dari satu kali dalam file.',
  NAMA_KOSONG: 'Nama wajib pajak kosong.',
  KECAMATAN_KOSONG: 'Kecamatan objek pajak kosong.',
  FORMAT_BARIS: 'Jumlah kolom pada baris tidak sesuai dengan header.',
};

const PESAN_TAHUN: Record<(typeof JENIS_ALASAN_TAHUN)[number], (tahun: string) => string> = {
  TANGGAL_KOSONG: (tahun) => `Tanggal lunas tahun ${tahun} kosong.`,
  TANGGAL_TIDAK_DIKENALI: (tahun) => `Format tanggal lunas tahun ${tahun} tidak dikenali.`,
  TANGGAL_SEBELUM_TAHUN_PAJAK: (tahun) =>
    `Tanggal lunas tahun ${tahun} lebih awal dari 1 Januari ${tahun} (data diduga salah).`,
  LEWAT_BATAS: (tahun) => `Tanggal lunas tahun ${tahun} melewati tanggal batas.`,
};

/** Pesan Indonesia untuk satu kode alasan (PRD §6.0). */
export function pesanAlasan(kode: KodeAlasan): string {
  if (kode in PESAN_UMUM) {
    return PESAN_UMUM[kode as keyof typeof PESAN_UMUM];
  }
  // Kode per tahun selalu berakhiran `_<TAHUN>` empat digit.
  const jenis = kode.slice(0, -5) as keyof typeof PESAN_TAHUN;
  return PESAN_TAHUN[jenis](kode.slice(-4));
}

/** Kode alasan yang dikenal sistem (untuk memvalidasi filter dan data tersimpan). */
export function isKodeAlasan(nilai: string): nilai is KodeAlasan {
  return (KODE_ALASAN as readonly string[]).includes(nilai);
}

export type DataSyarat = {
  nopValid: boolean;
  nama: string;
  kecamatan: string;
  lunas: Readonly<Record<TahunLunas, Result<Date, GalatTanggal>>>;
};

export type AturanSyarat = {
  /** Batas pelunasan inklusif. */
  batasLunas: Date;
};

/**
 * Evaluasi syarat kepesertaan satu baris (PRD §6.0). Mengumpulkan SEMUA alasan gugur, bukan
 * berhenti di alasan pertama. NOP ganda ditandai terpisah karena butuh seluruh isi file
 * (`tandaiNopGanda`). Pembayaran terlambat tetap sah selama paling lambat tanggal batas
 * (DECISIONS 004); tanggal sebelum 1 Januari tahun pajaknya menggugurkan (DECISIONS 006).
 */
export function evaluateEligibility(
  data: DataSyarat,
  aturan: AturanSyarat,
): { eligible: boolean; alasan: KodeAlasan[] } {
  const alasan: KodeAlasan[] = [];
  if (!data.nopValid) alasan.push('NOP_INVALID');
  if (data.nama.trim() === '') alasan.push('NAMA_KOSONG');
  if (data.kecamatan.trim() === '') alasan.push('KECAMATAN_KOSONG');
  for (const tahun of TAHUN_LUNAS) {
    const lunas = data.lunas[tahun];
    if (!lunas.ok) {
      alasan.push(kodeTahun(lunas.error, tahun));
      continue;
    }
    if (lunas.value < awalTahunWib(tahun)) {
      alasan.push(kodeTahun('TANGGAL_SEBELUM_TAHUN_PAJAK', tahun));
    }
    if (lunas.value > aturan.batasLunas) {
      alasan.push(kodeTahun('LEWAT_BATAS', tahun));
    }
  }
  return { eligible: alasan.length === 0, alasan };
}
