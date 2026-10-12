import 'server-only';

import { createHash } from 'node:crypto';

import { z } from 'zod';

import { type Prisma } from '@/generated/prisma/client';
import {
  BARIS_IMPOR_MAKS,
  KODE_ALASAN,
  PESAN_PERIODE_DITOLAK,
  evaluasiImpor,
  isoWib,
  periksaHeader,
  type KodeAlasan,
  type PesertaTerevaluasi,
  type PetaKolom,
  type RingkasanImpor,
} from '@/lib/domain';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { bacaFileImpor } from '@/server/impor/baca-file';
import { type FormImpor } from '@/server/impor/form';
import { enkripsiNik } from '@/server/nik';
import { type KonteksRequest } from '@/server/request';

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

/** Jumlah baris per `createMany` (ARCHITECTURE §10). */
const UKURAN_BATCH = 1000;

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

function keRingkasan(impor: BarisImpor, version: number): RingkasanPeserta {
  const tersimpan = RingkasanTersimpanSchema.parse(impor.ringkasan);
  // Pemetaan kecamatan ke wilayah belum ada (tiket 08): semua lolos masih belum dipetakan.
  return {
    imporId: impor.id,
    namaFile: impor.namaFile,
    diimporAt: isoWib(impor.createdAt),
    totalBaris: impor.totalBaris,
    jumlahLolos: impor.jumlahLolos,
    jumlahGugur: impor.jumlahGugur,
    lolosPerWilayah: { W1: 0, W2: 0, BELUM_DIPETAKAN: impor.jumlahLolos },
    // jsonb tidak menjaga urutan kunci: susun ulang menurut urutan kode dan abjad kecamatan.
    gugurPerAlasan: urutkanPerAlasan(tersimpan.gugurPerAlasan),
    nikTidakValid: tersimpan.nikTidakValid,
    nopGanda: tersimpan.nopGanda,
    kecamatanBelumDipetakan: Object.keys(tersimpan.lolosPerKecamatan).sort(),
    version,
  };
}

const PILIH_IMPOR = {
  id: true,
  namaFile: true,
  totalBaris: true,
  jumlahLolos: true,
  jumlahGugur: true,
  ringkasan: true,
  createdAt: true,
} as const satisfies Prisma.ImporSelect;

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
  return aktif === undefined ? null : keRingkasan(aktif, periode.version);
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
    return keRingkasan(impor, periode.version + 1);
  }, OPSI_TRANSAKSI);
}
