import 'server-only';

import { createHash } from 'node:crypto';

import { z } from 'zod';

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
import { enkripsiNik } from '@/server/nik';
import { type KonteksRequest } from '@/server/request';
import { petaKecamatanWilayah, sinkronkanKecamatan } from '@/server/services/wilayah';

/** Jumlah baris per batch operasi peserta. */
const UKURAN_BATCH = 2000;

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
  gugurPerAlasan: z.record(z.string(), z.number()),
  nikTidakValid: z.number(),
  nopGanda: z.number(),
  lolosPerKecamatan: z.record(z.string(), z.number()),
});



/** Impor 46.000 baris butuh lebih dari batas transaksi bawaan Prisma (5 detik). */
const OPSI_TRANSAKSI = { timeout: 120_000, maxWait: 10_000 } as const;

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
  const tersimpan = RingkasanTersimpanSchema.parse(impor.ringkasan);
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

function keDataPeserta(
  p: PesertaTerevaluasi,
  ids: { periodeId: string; imporId: string },
): Prisma.PesertaCreateManyInput {
  return {
    ...ids,
    baris: p.baris,
    nop: p.nop,
    // NIK mentah hanya disimpan terenkripsi; tampilan memakai `nikMasked` (DECISIONS 014).
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
 * Impor CSV ke periode Draf (ARCHITECTURE §6.2): baca & periksa header → evaluasi murni di
 * memori → satu transaksi: naikkan `version`, hapus peserta lama, nonaktifkan impor lama, simpan
 * impor + peserta per 1.000 baris, audit. Gagal di tengah = rollback; data lama tetap utuh.
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
    for (let awal = 0; awal < peserta.length; awal += UKURAN_BATCH) {
      await tx.peserta.createMany({
        data: peserta
          .slice(awal, awal + UKURAN_BATCH)
          .map((p) => keDataPeserta(p, { periodeId, imporId: impor.id })),
      });
    }
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
