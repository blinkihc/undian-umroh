import 'server-only';

import { createHash } from 'node:crypto';

import { z } from 'zod';

import { ulid } from 'ulid';

import { type Prisma } from '@/generated/prisma/client';
import {
  BARIS_IMPOR_MAKS,
  KODE_ALASAN,
  PESAN_PERIODE_DITOLAK,
  evaluasiImpor,
  evaluateEligibility,
  isoWib,
  periksaHeader,
  type AturanSyarat,
  type GalatTanggal,
  type KodeAlasan,
  type KodeWilayah,
  type PesertaTerevaluasi,
  type PetaKolom,
  type Result,
  type RingkasanImpor,
  type TahunLunas,
} from '@/lib/domain';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb, type DbClient } from '@/server/db';
import { AppError } from '@/server/errors';
import { bacaFileImpor } from '@/server/impor/baca-file';
import { type FormImpor } from '@/server/impor/form';
import { enkripsiBanyakNik, enkripsiNik } from '@/server/nik';
import { type KonteksRequest } from '@/server/request';
import { petaKecamatanWilayah, sinkronkanKecamatan } from '@/server/services/wilayah';

/** Jumlah baris per batch operasi peserta (optimal untuk limit parameter PostgreSQL). */
const UKURAN_BATCH = 2500;

const PILIH_IMPOR = {
  id: true,
  namaFile: true,
  totalBaris: true,
  jumlahLolos: true,
  jumlahGugur: true,
  ringkasan: true,
  createdAt: true,
} as const satisfies Prisma.ImporSelect;

/**
 * Evaluasi ulang semua peserta periode dengan `batasLunas` baru (Tiket 09). Dipanggil di dalam
 * transaksi `ubahPeriode` saat `batasLunas` berubah. Memperbarui `eligible`, `alasan`, dan
 * ringkasan impor aktif dalam satu batch.
 */
export async function evaluasiUlangPeserta(
  tx: DbClient,
  periodeId: string,
  batasLunas: Date,
): Promise<void> {
  const barisPeserta = await tx.peserta.findMany({
    where: { periodeId },
    select: {
      id: true,
      nop: true,
      nikValid: true,
      nama: true,
      kecamatan: true,
      lunas2022: true,
      lunas2023: true,
      lunas2024: true,
      lunas2025: true,
      lunas2026: true,
      eligible: true,
      alasan: true,
    },
  });
  if (barisPeserta.length === 0) return;

  const aturan: AturanSyarat = { batasLunas };

  function keHasilTanggal(nilai: Date | null): Result<Date, GalatTanggal> {
    if (nilai === null) return { ok: false as const, error: 'TANGGAL_KOSONG' as const };
    return { ok: true as const, value: nilai };
  }

  // NOP_DUPLICATE dipertahankan karena tidak terpengaruh batasLunas.
  // FORMAT_BARIS juga dipertahankan.
  const ALASAN_TETAP = ['NOP_DUPLICATE', 'FORMAT_BARIS'] as const;

  const hasilEvaluasiSemua: { id: string; eligible: boolean; alasan: KodeAlasan[] }[] = [];
  const barisPerluUpdate: { id: string; eligible: boolean; alasan: KodeAlasan[] }[] = [];

  for (const p of barisPeserta) {
    const lunas: Record<TahunLunas, Result<Date, GalatTanggal>> = {
      2022: keHasilTanggal(p.lunas2022),
      2023: keHasilTanggal(p.lunas2023),
      2024: keHasilTanggal(p.lunas2024),
      2025: keHasilTanggal(p.lunas2025),
      2026: keHasilTanggal(p.lunas2026),
    };
    // Cek NOP valid: 18 digit dan diawali 1609.
    const nopValid = /^\d{18}$/.test(p.nop) && p.nop.startsWith('1609');
    const hasil = evaluateEligibility(
      { nopValid, nama: p.nama, kecamatan: p.kecamatan, lunas },
      aturan,
    );
    const alasanTetap = p.alasan.filter((a): a is KodeAlasan =>
      (ALASAN_TETAP as readonly string[]).includes(a),
    );
    const gabung = [...new Set([...alasanTetap, ...hasil.alasan])].sort(
      (a, b) => KODE_ALASAN.indexOf(a) - KODE_ALASAN.indexOf(b),
    );
    const eligible = gabung.length === 0;

    hasilEvaluasiSemua.push({ id: p.id, eligible, alasan: gabung });

    const alasanSama =
      p.alasan.length === gabung.length && p.alasan.every((a, idx) => a === gabung[idx]);
    if (p.eligible !== eligible || !alasanSama) {
      barisPerluUpdate.push({ id: p.id, eligible, alasan: gabung });
    }
  }

  for (let awal = 0; awal < barisPerluUpdate.length; awal += UKURAN_BATCH) {
    const potongan = barisPerluUpdate.slice(awal, awal + UKURAN_BATCH);
    await Promise.all(
      potongan.map((p) =>
        tx.peserta.update({ where: { id: p.id }, data: { eligible: p.eligible, alasan: p.alasan } }),
      ),
    );
  }

  // Perbarui ringkasan impor aktif.
  const imporAktif = await tx.impor.findFirst({ where: { periodeId, aktif: true }, select: PILIH_IMPOR });
  if (imporAktif === null) return;

  const lolosPerKecamatanMap = new Map<string, number>();
  const gugurPerAlasanMap = new Map<KodeAlasan, number>();
  let jumlahLolos = 0;
  let nikTidakValid = 0;
  const nopHitung = new Map<string, number>();
  for (const p of barisPeserta) {
    if (/^\d{18}$/.test(p.nop)) nopHitung.set(p.nop, (nopHitung.get(p.nop) ?? 0) + 1);
  }
  const nopGanda = [...nopHitung.values()].filter((n) => n > 1).length;
  for (let i = 0; i < barisPeserta.length; i++) {
    const p = barisPeserta[i];
    const u = hasilEvaluasiSemua[i];
    if (p === undefined || u === undefined) {
      continue;
    }
    if (u.eligible) {
      jumlahLolos += 1;
      if (p.kecamatan !== '') {
        lolosPerKecamatanMap.set(p.kecamatan, (lolosPerKecamatanMap.get(p.kecamatan) ?? 0) + 1);
      }
    }
    if (!p.nikValid) nikTidakValid += 1;
    for (const a of u.alasan) gugurPerAlasanMap.set(a, (gugurPerAlasanMap.get(a) ?? 0) + 1);
  }
  const gugurPerAlasan: Partial<Record<KodeAlasan, number>> = {};
  for (const kode of KODE_ALASAN) {
    const n = gugurPerAlasanMap.get(kode);
    if (n !== undefined) gugurPerAlasan[kode] = n;
  }
  const lolosPerKecamatan: Record<string, number> = {};
  for (const [k, v] of [...lolosPerKecamatanMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lolosPerKecamatan[k] = v;
  }

  await tx.impor.update({
    where: { id: imporAktif.id },
    data: {
      jumlahLolos,
      jumlahGugur: barisPeserta.length - jumlahLolos,
      ringkasan: { gugurPerAlasan, nikTidakValid, nopGanda, lolosPerKecamatan },
    },
  });
}

/** Ringkasan data peserta periode (API.md POST /api/periode/:id/impor dan GET …/ringkasan). */
export type RingkasanPeserta = {
  imporId: string;
  namaFile: string;
  diimporAt: string;
  totalBaris: number;
  jumlahLolos: number;
  jumlahGugur: number;
  lolosPerWilayah: { W1: number; W2: number; BELUM_DIPETAKAN: number };
  gugurPerAlasan: Partial<Record<KodeAlasan, number>>;
  nikTidakValid: number;
  nopGanda: number;
  kecamatanBelumDipetakan: string[];
  version: number;
};

/** Bagian ringkasan yang disimpan di kolom `impor.ringkasan`. */
const RingkasanTersimpanSchema = z.object({
  gugurPerAlasan: z.record(z.string(), z.number()).default({}),
  nikTidakValid: z.number().default(0),
  nopGanda: z.number().default(0),
  lolosPerKecamatan: z.record(z.string(), z.number()).default({}),
});

/** Impor hingga 500.000 baris butuh waktu transaksi lebih panjang (30 menit). */
const OPSI_TRANSAKSI = { timeout: 1_800_000, maxWait: 60_000 } as const;

type BarisImpor = {
  id: string;
  namaFile: string;
  totalBaris: number;
  jumlahLolos: number;
  jumlahGugur: number;
  ringkasan: Prisma.JsonValue;
  createdAt: Date;
};

function urutkanPerAlasan(isi: Record<string, number>): Partial<Record<KodeAlasan, number>> {
  const hasil: Partial<Record<KodeAlasan, number>> = {};
  for (const kode of KODE_ALASAN) {
    const jumlah = isi[kode];
    if (jumlah !== undefined) hasil[kode] = jumlah;
  }
  return hasil;
}

function keRingkasan(
  impor: BarisImpor,
  version: number,
  peta: Map<string, KodeWilayah>,
): RingkasanPeserta {
  const hasilParse = RingkasanTersimpanSchema.safeParse(impor.ringkasan);
  const tersimpan = hasilParse.success
    ? hasilParse.data
    : { gugurPerAlasan: {}, nikTidakValid: 0, nopGanda: 0, lolosPerKecamatan: {} };
  // Lolos per wilayah dihitung dari ringkasan per kecamatan + pemetaan terkini (API.md).
  const lolosPerWilayah = { W1: 0, W2: 0, BELUM_DIPETAKAN: 0 };
  const belum: string[] = [];
  for (const [kecamatan, jumlah] of Object.entries(tersimpan.lolosPerKecamatan)) {
    const wilayah = peta.get(kecamatan);
    lolosPerWilayah[wilayah ?? 'BELUM_DIPETAKAN'] += jumlah;
    if (wilayah === undefined) belum.push(kecamatan);
  }
  // Peserta lolos selalu punya kecamatan (KECAMATAN_KOSONG menggugurkan), jadi totalnya sama.
  return {
    imporId: impor.id,
    namaFile: impor.namaFile,
    diimporAt: isoWib(impor.createdAt),
    totalBaris: impor.totalBaris,
    jumlahLolos: impor.jumlahLolos,
    jumlahGugur: impor.jumlahGugur,
    lolosPerWilayah,
    // jsonb tidak menjaga urutan kunci: susun ulang menurut urutan kode dan abjad kecamatan.
    gugurPerAlasan: urutkanPerAlasan(tersimpan.gugurPerAlasan),
    nikTidakValid: tersimpan.nikTidakValid,
    nopGanda: tersimpan.nopGanda,
    kecamatanBelumDipetakan: belum.sort(),
    version,
  };
}



/** Ringkasan impor aktif periode, atau null bila belum ada data peserta. */
export async function ambilRingkasanPeserta(periodeId: string): Promise<RingkasanPeserta | null> {
  const periode = await getDb().periode.findUnique({
    where: { id: periodeId },
    select: { version: true, impor: { where: { aktif: true }, select: PILIH_IMPOR } },
  });
  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }
  const [aktif] = periode.impor;
  if (aktif === undefined) return null;
  return keRingkasan(aktif, periode.version, await petaKecamatanWilayah(periodeId));
}

type PeriodeImpor = { id: string; status: string; version: number; batasLunas: Date };

/** Status dan versi periode tujuan; status diperiksa lebih dulu dari versi (sama dengan periode). */
async function periksaPeriode(periodeId: string, version: number): Promise<PeriodeImpor> {
  const periode = await getDb().periode.findUnique({
    where: { id: periodeId },
    select: { id: true, status: true, version: true, batasLunas: true },
  });
  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }
  if (periode.status !== 'DRAF') {
    throw new AppError(
      'PERIODE_TERKUNCI',
      409,
      periode.status === 'DIBATALKAN'
        ? PESAN_PERIODE_DITOLAK.PERIODE_SUDAH_DIBATALKAN
        : 'Periode sudah terkunci. Data tidak dapat diubah.',
      { status: periode.status },
    );
  }
  if (periode.version !== version) {
    throw galatVersi(periode.version);
  }
  return periode;
}

function galatVersi(versionSekarang: number): AppError {
  return new AppError(
    'CONFLICT',
    409,
    'Periode ini baru saja diubah orang lain. Muat ulang lalu coba lagi.',
    { version: versionSekarang },
  );
}

/** Pemeriksaan tingkat file; kegagalan menolak impor seluruhnya (ERROR_HANDLING, impor). */
async function bacaIsiFile(file: FormImpor): Promise<{ peta: PetaKolom; baris: string[][] }> {
  const isi = await bacaFileImpor(file);
  const header = periksaHeader(isi.header);
  if (!header.ok) {
    const { hilang = [], tidakDikenal = [] } = (header.details ?? {}) as {
      hilang?: string[];
      tidakDikenal?: string[];
    };
    const bagian = [
      hilang.length > 0 ? `Kolom hilang: ${hilang.join(', ')}.` : '',
      tidakDikenal.length > 0 ? `Kolom tidak dikenal: ${tidakDikenal.join(', ')}.` : '',
    ].filter((b) => b !== '');
    throw new AppError(
      'HEADER_TIDAK_SESUAI',
      400,
      `Header file tidak sesuai. ${bagian.join(' ')}`,
      {
        hilang,
        tidakDikenal,
      },
    );
  }
  if (isi.baris.length === 0) {
    throw new AppError('FILE_TIDAK_VALID', 400, 'File tidak berisi data peserta.');
  }
  if (isi.baris.length > BARIS_IMPOR_MAKS) {
    throw new AppError(
      'FILE_TIDAK_VALID',
      400,
      `File berisi lebih dari ${BARIS_IMPOR_MAKS.toLocaleString('id-ID')} baris data.`,
    );
  }
  return { peta: header.value, baris: isi.baris };
}

type DataPesertaMentah = Omit<Prisma.PesertaCreateManyInput, 'periodeId' | 'imporId'>;

function formatPostgresArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return `{${arr.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
}

function siapkanBanyakDataPeserta(daftar: PesertaTerevaluasi[]): DataPesertaMentah[] {
  const nikList = daftar.map((p) => p.nik);
  const nikEncList = enkripsiBanyakNik(nikList);

  return daftar.map((p, idx) => ({
    baris: p.baris,
    nop: p.nop,
    nikEnc: (nikEncList[idx] ?? null) as Uint8Array<ArrayBuffer> | null,
    nikMasked: p.nikMasked,
    nikValid: p.nikValid,
    nama: p.nama,
    alamatWp: p.alamatWp,
    alamatOp: p.alamatOp,
    kecamatanRaw: p.kecamatanRaw,
    kecamatan: p.kecamatan,
    kelurahan: p.kelurahan,
    lunas2022: p.lunas[2022],
    lunas2023: p.lunas[2023],
    lunas2024: p.lunas[2024],
    lunas2025: p.lunas[2025],
    lunas2026: p.lunas[2026],
    lunasRaw: p.lunasRaw,
    eligible: p.eligible,
    alasan: p.alasan,
  }));
}

function siapkanDataPeserta(p: PesertaTerevaluasi): DataPesertaMentah {
  return {
    baris: p.baris,
    nop: p.nop,
    nikEnc: p.nik === '' ? null : new Uint8Array(enkripsiNik(p.nik)),
    nikMasked: p.nikMasked,
    nikValid: p.nikValid,
    nama: p.nama,
    alamatWp: p.alamatWp,
    alamatOp: p.alamatOp,
    kecamatanRaw: p.kecamatanRaw,
    kecamatan: p.kecamatan,
    kelurahan: p.kelurahan,
    lunas2022: p.lunas[2022],
    lunas2023: p.lunas[2023],
    lunas2024: p.lunas[2024],
    lunas2025: p.lunas[2025],
    lunas2026: p.lunas[2026],
    lunasRaw: p.lunasRaw,
    eligible: p.eligible,
    alasan: p.alasan,
  };
}

/**
 * Menyimpan data peserta secara massal menggunakan UNNEST array PostgreSQL (kinerja ~10x lipat lebih
 * cepat dibandingkan parameterized insert standar Prisma untuk dataset ratusan ribu baris).
 */
async function simpanPesertaBulk(
  tx: DbClient,
  periodeId: string,
  imporId: string,
  dataPeserta: DataPesertaMentah[],
): Promise<void> {
  const UKURAN_CHUNK = 20_000;

  for (let awal = 0; awal < dataPeserta.length; awal += UKURAN_CHUNK) {
    const chunk = dataPeserta.slice(awal, awal + UKURAN_CHUNK);
    const n = chunk.length;

    const ids = new Array<string>(n);
    const periodeIds = new Array<string>(n);
    const imporIds = new Array<string>(n);
    const bariss = new Array<number>(n);
    const nops = new Array<string>(n);
    const nikEncs = new Array<Buffer | null>(n);
    const nikMaskeds = new Array<string>(n);
    const nikValids = new Array<boolean>(n);
    const namas = new Array<string>(n);
    const alamatWps = new Array<string>(n);
    const alamatOps = new Array<string>(n);
    const kecamatanRaws = new Array<string>(n);
    const kecamatans = new Array<string>(n);
    const kelurahans = new Array<string>(n);
    const lunas2022s = new Array<Date | string | null>(n);
    const lunas2023s = new Array<Date | string | null>(n);
    const lunas2024s = new Array<Date | string | null>(n);
    const lunas2025s = new Array<Date | string | null>(n);
    const lunas2026s = new Array<Date | string | null>(n);
    const lunasRaws = new Array<string>(n);
    const eligibles = new Array<boolean>(n);
    const alasans = new Array<string>(n);

    for (let i = 0; i < n; i++) {
      const d = chunk[i]!;
      ids[i] = ulid();
      periodeIds[i] = periodeId;
      imporIds[i] = imporId;
      bariss[i] = d.baris;
      nops[i] = d.nop;
      nikEncs[i] = d.nikEnc !== null && d.nikEnc !== undefined ? Buffer.from(d.nikEnc) : null;
      nikMaskeds[i] = d.nikMasked;
      nikValids[i] = d.nikValid;
      namas[i] = d.nama;
      alamatWps[i] = d.alamatWp;
      alamatOps[i] = d.alamatOp;
      kecamatanRaws[i] = d.kecamatanRaw;
      kecamatans[i] = d.kecamatan;
      kelurahans[i] = d.kelurahan;
      lunas2022s[i] = d.lunas2022 ?? null;
      lunas2023s[i] = d.lunas2023 ?? null;
      lunas2024s[i] = d.lunas2024 ?? null;
      lunas2025s[i] = d.lunas2025 ?? null;
      lunas2026s[i] = d.lunas2026 ?? null;
      lunasRaws[i] = JSON.stringify(d.lunasRaw);
      eligibles[i] = d.eligible;
      alasans[i] = formatPostgresArray(d.alasan as string[]);
    }

    await tx.$executeRawUnsafe(
      `INSERT INTO "peserta" (
        "id", "periode_id", "impor_id", "baris", "nop", "nik_enc", "nik_masked", "nik_valid",
        "nama", "alamat_wp", "alamat_op", "kecamatan_raw", "kecamatan", "kelurahan",
        "lunas_2022", "lunas_2023", "lunas_2024", "lunas_2025", "lunas_2026",
        "lunas_raw", "eligible", "alasan"
      )
      SELECT
        u.id, u.periode_id, u.impor_id, u.baris, u.nop, u.nik_enc, u.nik_masked, u.nik_valid,
        u.nama, u.alamat_wp, u.alamat_op, u.kecamatan_raw, u.kecamatan, u.kelurahan,
        u.lunas_2022, u.lunas_2023, u.lunas_2024, u.lunas_2025, u.lunas_2026,
        u.lunas_raw::jsonb, u.eligible, u.alasan::text[]
      FROM UNNEST(
        $1::text[], $2::text[], $3::text[], $4::int[], $5::text[], $6::bytea[], $7::text[], $8::bool[],
        $9::text[], $10::text[], $11::text[], $12::text[], $13::text[], $14::text[],
        $15::timestamptz[], $16::timestamptz[], $17::timestamptz[], $18::timestamptz[], $19::timestamptz[],
        $20::text[], $21::bool[], $22::text[]
      ) AS u(
        id, periode_id, impor_id, baris, nop, nik_enc, nik_masked, nik_valid,
        nama, alamat_wp, alamat_op, kecamatan_raw, kecamatan, kelurahan,
        lunas_2022, lunas_2023, lunas_2024, lunas_2025, lunas_2026,
        lunas_raw, eligible, alasan
      )`,
      ids,
      periodeIds,
      imporIds,
      bariss,
      nops,
      nikEncs,
      nikMaskeds,
      nikValids,
      namas,
      alamatWps,
      alamatOps,
      kecamatanRaws,
      kecamatans,
      kelurahans,
      lunas2022s,
      lunas2023s,
      lunas2024s,
      lunas2025s,
      lunas2026s,
      lunasRaws,
      eligibles,
      alasans,
    );
  }
}

function ringkasanTersimpan(r: RingkasanImpor): Prisma.InputJsonObject {
  return {
    gugurPerAlasan: r.gugurPerAlasan,
    nikTidakValid: r.nikTidakValid,
    nopGanda: r.nopGanda,
    lolosPerKecamatan: r.lolosPerKecamatan,
  };
}

/** Penolakan tingkat file dicatat di audit (`IMPOR_DITOLAK`) lalu diteruskan ke pemanggil. */
async function catatPenolakan(masukan: {
  aktor: PenggunaSesi;
  periodeId: string;
  file: FormImpor;
  sha256: string;
  galat: AppError;
  konteks: KonteksRequest;
}): Promise<void> {
  const { aktor, periodeId, file, sha256, galat, konteks } = masukan;
  await getDb().$transaction(async (tx) => {
    await audit(tx, {
      aksi: 'IMPOR_DITOLAK',
      aktor,
      targetTipe: 'periode',
      targetId: periodeId,
      payload: {
        namaFile: file.nama.slice(0, 200),
        fileSha256: sha256,
        kode: galat.code,
        ...(galat.code === 'HEADER_TIDAK_SESUAI' && (galat.details as Prisma.InputJsonObject)),
      },
      konteks,
    });
  });
}

/**
 * Impor CSV/XLSX ke periode Draf (ARCHITECTURE §6.2): baca & periksa header → evaluasi murni di
 * memori → satu transaksi: naikkan `version`, hapus peserta lama, nonaktifkan impor lama, simpan
 * impor + peserta massal, audit. Gagal di tengah = rollback; data lama tetap utuh.
 */
export async function imporFile(masukan: {
  aktor: PenggunaSesi;
  periodeId: string;
  file: FormImpor;
  konteks: KonteksRequest;
}): Promise<RingkasanPeserta> {
  const { aktor, periodeId, file, konteks } = masukan;
  const periode = await periksaPeriode(periodeId, file.version);
  const sha256 = createHash('sha256').update(file.bytes).digest('hex');

  let isi: { peta: PetaKolom; baris: string[][] };
  try {
    isi = await bacaIsiFile(file);
  } catch (error) {
    if (error instanceof AppError) {
      await catatPenolakan({ aktor, periodeId, file, sha256, galat: error, konteks });
    }
    throw error;
  }

  const { peserta, ringkasan } = evaluasiImpor({
    baris: isi.baris,
    peta: isi.peta,
    aturan: { batasLunas: periode.batasLunas },
  });

  // Siapkan data peserta & enkripsi NIK di luar transaksi (menghemat jatah waktu transaksi DB)
  const dataPeserta = siapkanBanyakDataPeserta(peserta);

  return getDb().$transaction(async (tx) => {
    const naik = await tx.periode.updateMany({
      where: { id: periodeId, version: file.version, status: 'DRAF' },
      data: { version: { increment: 1 } },
    });
    if (naik.count === 0) {
      throw galatVersi(periode.version);
    }
    const lama = await tx.peserta.deleteMany({ where: { periodeId } });
    await tx.impor.updateMany({ where: { periodeId, aktif: true }, data: { aktif: false } });
    const impor = await tx.impor.create({
      data: {
        periodeId,
        namaFile: file.nama.slice(0, 200),
        fileSha256: sha256,
        totalBaris: ringkasan.totalBaris,
        jumlahLolos: ringkasan.jumlahLolos,
        jumlahGugur: ringkasan.jumlahGugur,
        ringkasan: ringkasanTersimpan(ringkasan),
        importedById: aktor.id,
      },
      select: PILIH_IMPOR,
    });

    // Lepas sementara 6 indeks sekunder & nonaktifkan replikasi foreign key berulang
    await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = 'replica';`);
    await tx.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "peserta_alasan_idx";
      DROP INDEX IF EXISTS "peserta_periode_id_eligible_idx";
      DROP INDEX IF EXISTS "peserta_periode_id_kecamatan_idx";
      DROP INDEX IF EXISTS "peserta_periode_id_nop_idx";
      DROP INDEX IF EXISTS "peserta_periode_id_nama_idx";
      DROP INDEX IF EXISTS "peserta_periode_id_baris_idx";
    `);

    try {
      await simpanPesertaBulk(tx, periodeId, impor.id, dataPeserta);
    } catch {
      // Fallback aman ke createMany bila UNNEST tidak didukung lingkungan
      for (let awal = 0; awal < dataPeserta.length; awal += UKURAN_BATCH) {
        await tx.peserta.createMany({
          data: dataPeserta
            .slice(awal, awal + UKURAN_BATCH)
            .map((d) => ({
              ...d,
              periodeId,
              imporId: impor.id,
            })),
        });
      }
    }

    // Buat ulang seluruh 6 indeks sekunder secara massal
    await tx.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "peserta_periode_id_eligible_idx" ON "peserta"("periode_id", "eligible");
      CREATE INDEX IF NOT EXISTS "peserta_periode_id_kecamatan_idx" ON "peserta"("periode_id", "kecamatan");
      CREATE INDEX IF NOT EXISTS "peserta_periode_id_nop_idx" ON "peserta"("periode_id", "nop");
      CREATE INDEX IF NOT EXISTS "peserta_periode_id_nama_idx" ON "peserta"("periode_id", "nama");
      CREATE INDEX IF NOT EXISTS "peserta_periode_id_baris_idx" ON "peserta"("periode_id", "baris");
      CREATE INDEX IF NOT EXISTS "peserta_alasan_idx" ON "peserta" USING GIN ("alasan");
    `);
    await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = 'origin';`);

    await audit(tx, {
      aksi: 'IMPOR_BERHASIL',
      aktor,
      targetTipe: 'periode',
      targetId: periodeId,
      payload: {
        imporId: impor.id,
        namaFile: impor.namaFile,
        fileSha256: sha256,
        totalBaris: ringkasan.totalBaris,
        jumlahLolos: ringkasan.jumlahLolos,
        jumlahGugur: ringkasan.jumlahGugur,
        pesertaLamaDiganti: lama.count,
      },
      konteks,
    });
    // Kecamatan baru muncul sebagai belum dipetakan; pemetaan lama dipertahankan (DATABASE §3).
    await sinkronkanKecamatan(tx, periodeId, Object.keys(ringkasan.lolosPerKecamatan));
    return keRingkasan(impor, periode.version + 1, await petaKecamatanWilayah(periodeId, tx));
  }, OPSI_TRANSAKSI);
}
