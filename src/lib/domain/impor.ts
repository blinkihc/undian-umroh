import { normalizeKecamatan } from './kecamatan';
import { isValidNik, maskNik } from './nik';
import { normalizeNop } from './nop';
import { type Result } from './result';
import {
  KODE_ALASAN,
  TAHUN_LUNAS,
  evaluateEligibility,
  type AturanSyarat,
  type KodeAlasan,
  type TahunLunas,
} from './syarat';
import { parseTanggalLunas } from './tanggal-lunas';

/** Header wajib file impor, 12 kolom (PRD §6.0). */
export const HEADER_IMPOR = [
  'NOP',
  'wp_no_ktp',
  'wp_nama',
  'wp_alamat',
  'OP_ALAMAT',
  'OP_KECAMATAN',
  'op_kelurahan',
  'Tanggal Lunas 2022',
  'Tanggal Lunas 2023',
  'Tanggal Lunas 2024',
  'Tanggal Lunas 2025',
  'Tanggal Lunas 2026',
] as const;

export type KolomImpor = (typeof HEADER_IMPOR)[number];

/** Posisi setiap kolom wajib di file. */
export type PetaKolom = Readonly<Record<KolomImpor, number>>;

/** Batas jumlah baris data per impor (ERROR_HANDLING, kesalahan impor). */
export const BARIS_IMPOR_MAKS = 100_000;

function kunciHeader(nama: string): string {
  return nama.trim().toLowerCase();
}

const KOLOM_PER_KUNCI = new Map<string, KolomImpor>(HEADER_IMPOR.map((k) => [kunciHeader(k), k]));

/**
 * Memeriksa header (tidak peka huruf besar/kecil dan spasi di ujung). Kolom wajib yang tidak ada
 * masuk `hilang`; kolom lain atau kolom wajib yang muncul dua kali masuk `tidakDikenal`.
 */
export function periksaHeader(header: readonly string[]): Result<PetaKolom, 'HEADER_TIDAK_SESUAI'> {
  const posisi = new Map<KolomImpor, number>();
  const tidakDikenal: string[] = [];
  header.forEach((nama, indeks) => {
    const kolom = KOLOM_PER_KUNCI.get(kunciHeader(nama));
    if (kolom === undefined || posisi.has(kolom)) {
      tidakDikenal.push(nama.trim());
      return;
    }
    posisi.set(kolom, indeks);
  });
  const hilang = HEADER_IMPOR.filter((kolom) => !posisi.has(kolom));
  if (hilang.length > 0 || tidakDikenal.length > 0) {
    return { ok: false, error: 'HEADER_TIDAK_SESUAI', details: { hilang, tidakDikenal } };
  }
  return { ok: true, value: Object.fromEntries(posisi) as Record<KolomImpor, number> };
}

/** Hasil evaluasi satu baris. `nik` mentah hanya untuk dienkripsi server, jangan ditampilkan. */
export type PesertaTerevaluasi = {
  /** Nomor baris di file; header = baris 1. */
  baris: number;
  /** 18 digit bila valid, selain itu nilai mentah ter-trim. */
  nop: string;
  nopValid: boolean;
  nik: string;
  nikValid: boolean;
  nikMasked: string;
  nama: string;
  alamatWp: string;
  alamatOp: string;
  kecamatanRaw: string;
  kecamatan: string;
  kelurahan: string;
  lunas: Record<TahunLunas, Date | null>;
  lunasRaw: Record<TahunLunas, string>;
  eligible: boolean;
  alasan: KodeAlasan[];
};

function kolomTahun(tahun: TahunLunas): KolomImpor {
  return `Tanggal Lunas ${tahun.toString()}` as KolomImpor;
}

/** Mengevaluasi satu baris sel teks menurut peta kolom header (tanpa pemeriksaan NOP ganda). */
export function evaluasiBaris(masukan: {
  sel: readonly string[];
  baris: number;
  peta: PetaKolom;
  aturan: AturanSyarat;
}): PesertaTerevaluasi {
  const { sel, baris, peta, aturan } = masukan;
  const ambil = (kolom: KolomImpor): string => (sel[peta[kolom]] ?? '').trim();
  const nopMentah = ambil('NOP');
  const nop = normalizeNop(nopMentah);
  const nik = ambil('wp_no_ktp');
  const kecamatanRaw = ambil('OP_KECAMATAN');
  const lunasRaw = {} as Record<TahunLunas, string>;
  const lunas = {} as Record<TahunLunas, Date | null>;
  const hasilTanggal = {} as Record<TahunLunas, ReturnType<typeof parseTanggalLunas>>;
  for (const tahun of TAHUN_LUNAS) {
    lunasRaw[tahun] = ambil(kolomTahun(tahun));
    hasilTanggal[tahun] = parseTanggalLunas(lunasRaw[tahun]);
    const h = hasilTanggal[tahun];
    lunas[tahun] = h.ok ? h.value : null;
  }
  const data = {
    baris,
    nop: nop.ok ? nop.value : nopMentah,
    nopValid: nop.ok,
    nik,
    nikValid: isValidNik(nik),
    nikMasked: maskNik(nik),
    nama: ambil('wp_nama'),
    alamatWp: ambil('wp_alamat'),
    alamatOp: ambil('OP_ALAMAT'),
    kecamatanRaw,
    kecamatan: normalizeKecamatan(kecamatanRaw),
    kelurahan: ambil('op_kelurahan'),
    lunas,
    lunasRaw,
  };
  // Jumlah kolom salah: nilai lain bisa bergeser, jadi hanya alasan format yang dilaporkan.
  if (sel.length !== HEADER_IMPOR.length) {
    return { ...data, eligible: false, alasan: ['FORMAT_BARIS'] };
  }
  const hasil = evaluateEligibility(
    { nopValid: nop.ok, nama: data.nama, kecamatan: data.kecamatan, lunas: hasilTanggal },
    aturan,
  );
  return { ...data, ...hasil };
}

/**
 * Menandai SEMUA baris ber-NOP valid yang NOP-nya muncul lebih dari sekali (PRD §6.0 syarat 5).
 * Mengembalikan jumlah NOP berbeda yang ganda.
 */
export function tandaiNopGanda(peserta: PesertaTerevaluasi[]): number {
  const hitung = new Map<string, number>();
  for (const p of peserta) {
    if (p.nopValid) hitung.set(p.nop, (hitung.get(p.nop) ?? 0) + 1);
  }
  for (const p of peserta) {
    if (p.nopValid && (hitung.get(p.nop) ?? 0) > 1) {
      p.alasan = urutkanAlasan([...p.alasan, 'NOP_DUPLICATE']);
      p.eligible = false;
    }
  }
  return [...hitung.values()].filter((n) => n > 1).length;
}

function urutkanAlasan(alasan: KodeAlasan[]): KodeAlasan[] {
  return [...new Set(alasan)].sort((a, b) => KODE_ALASAN.indexOf(a) - KODE_ALASAN.indexOf(b));
}

/** Ringkasan impor yang disimpan bersama impor (DATABASE §3 `impor.ringkasan`). */
export type RingkasanImpor = {
  totalBaris: number;
  jumlahLolos: number;
  jumlahGugur: number;
  /** Jumlah baris per kode alasan; urutan kunci mengikuti `KODE_ALASAN`. */
  gugurPerAlasan: Partial<Record<KodeAlasan, number>>;
  nikTidakValid: number;
  /** Jumlah NOP berbeda yang muncul lebih dari sekali. */
  nopGanda: number;
  /** Kecamatan (ternormalisasi, tidak kosong) → jumlah peserta lolos; terurut abjad. */
  lolosPerKecamatan: Record<string, number>;
};

/** Menghitung ringkasan dari peserta yang sudah dievaluasi dan ditandai NOP gandanya. */
export function hitungRingkasanImpor(
  peserta: readonly PesertaTerevaluasi[],
  nopGanda: number,
): RingkasanImpor {
  const perAlasan = new Map<KodeAlasan, number>();
  const perKecamatan = new Map<string, number>();
  let jumlahLolos = 0;
  let nikTidakValid = 0;
  for (const p of peserta) {
    if (p.eligible) jumlahLolos += 1;
    if (!p.nikValid) nikTidakValid += 1;
    for (const kode of p.alasan) perAlasan.set(kode, (perAlasan.get(kode) ?? 0) + 1);
    if (p.kecamatan !== '') {
      perKecamatan.set(p.kecamatan, (perKecamatan.get(p.kecamatan) ?? 0) + (p.eligible ? 1 : 0));
    }
  }
  const gugurPerAlasan: Partial<Record<KodeAlasan, number>> = {};
  for (const kode of KODE_ALASAN) {
    const jumlah = perAlasan.get(kode);
    if (jumlah !== undefined) gugurPerAlasan[kode] = jumlah;
  }
  const lolosPerKecamatan: Record<string, number> = {};
  for (const nama of [...perKecamatan.keys()].sort()) {
    lolosPerKecamatan[nama] = perKecamatan.get(nama) ?? 0;
  }
  return {
    totalBaris: peserta.length,
    jumlahLolos,
    jumlahGugur: peserta.length - jumlahLolos,
    gugurPerAlasan,
    nikTidakValid,
    nopGanda,
    lolosPerKecamatan,
  };
}

/**
 * Evaluasi seluruh isi file: setiap baris data (mulai baris 2), lalu tandai NOP ganda dan hitung
 * ringkasan. Murni dan di memori; server hanya membaca file dan menyimpan hasilnya.
 */
export function evaluasiImpor(masukan: {
  baris: readonly (readonly string[])[];
  peta: PetaKolom;
  aturan: AturanSyarat;
}): { peserta: PesertaTerevaluasi[]; ringkasan: RingkasanImpor } {
  const peserta = masukan.baris.map((sel, indeks) =>
    evaluasiBaris({ sel, baris: indeks + 2, peta: masukan.peta, aturan: masukan.aturan }),
  );
  const nopGanda = tandaiNopGanda(peserta);
  return { peserta, ringkasan: hitungRingkasanImpor(peserta, nopGanda) };
}
