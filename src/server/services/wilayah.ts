import 'server-only';

import { z } from 'zod';

import {
  cariKecamatanMirip,
  hitungRingkasanWilayah,
  urutkanPemetaan,
  type KodeWilayah,
  type Pemetaan,
  type RingkasanWilayah,
  type StatusPeriode,
} from '@/lib/domain';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb, type DbClient } from '@/server/db';
import { AppError } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';

/** Respons `GET /api/periode/:id/wilayah` (API.md, Wilayah). */
export type PemetaanApi = {
  status: StatusPeriode;
  wilayah: { kode: KodeWilayah; nama: string }[];
  kecamatan: {
    kecamatan: string;
    wilayah: KodeWilayah | null;
    jumlahLolos: number;
    mirip: string[];
  }[];
  ringkasan: RingkasanWilayah;
  version: number;
};

const LolosPerKecamatanSchema = z.object({ lolosPerKecamatan: z.record(z.string(), z.number()) });

/** Kecamatan → wilayah yang sudah dipetakan untuk periode (hanya yang punya wilayah). */
export async function petaKecamatanWilayah(
  periodeId: string,
  db: DbClient = getDb(),
): Promise<Map<string, KodeWilayah>> {
  const baris = await db.kecamatanWilayah.findMany({
    where: { periodeId, wilayahId: { not: null } },
    select: { kecamatan: true, wilayah: { select: { kode: true } } },
  });
  const peta = new Map<string, KodeWilayah>();
  for (const b of baris) {
    if (b.wilayah !== null) peta.set(b.kecamatan, b.wilayah.kode);
  }
  return peta;
}

/** Kecamatan (tidak kosong) di impor aktif → jumlah peserta lolos. Kosong bila belum impor. */
export async function lolosPerKecamatanAktif(
  periodeId: string,
  db: DbClient = getDb(),
): Promise<Record<string, number>> {
  const impor = await db.impor.findFirst({
    where: { periodeId, aktif: true },
    select: { ringkasan: true },
  });
  return impor === null ? {} : LolosPerKecamatanSchema.parse(impor.ringkasan).lolosPerKecamatan;
}

/**
 * Memastikan setiap kecamatan di data impor punya baris pemetaan (awalnya belum dipetakan).
 * Pemetaan yang sudah ada tidak disentuh, sehingga impor ulang mempertahankannya.
 */
export async function sinkronkanKecamatan(
  tx: DbClient,
  periodeId: string,
  kecamatan: readonly string[],
): Promise<void> {
  if (kecamatan.length === 0) return;
  await tx.kecamatanWilayah.createMany({
    data: kecamatan.map((k) => ({ periodeId, kecamatan: k })),
    skipDuplicates: true,
  });
}

/** Pemetaan untuk tab Wilayah: hanya kecamatan yang ada di impor aktif. */
export async function ambilPemetaan(periodeId: string): Promise<PemetaanApi> {
  const db = getDb();
  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    select: {
      status: true,
      version: true,
      wilayah: { select: { kode: true, nama: true }, orderBy: { kode: 'asc' } },
    },
  });
  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }
  const [lolos, peta] = await Promise.all([
    lolosPerKecamatanAktif(periodeId, db),
    petaKecamatanWilayah(periodeId, db),
  ]);
  const nama = Object.keys(lolos);
  const mirip = cariKecamatanMirip(nama);
  const kecamatan = urutkanPemetaan(
    nama.map((k) => ({
      kecamatan: k,
      wilayah: peta.get(k) ?? null,
      jumlahLolos: lolos[k] ?? 0,
      mirip: mirip.get(k) ?? [],
    })),
  );
  return {
    status: periode.status,
    wilayah: periode.wilayah,
    kecamatan,
    ringkasan: hitungRingkasanWilayah(kecamatan),
    version: periode.version,
  };
}

/**
 * Menyimpan pemetaan (UX_FLOWS Flow 4) dengan optimistic concurrency `periode.version`. Hanya
 * saat Draf; setiap kecamatan harus ada di data impor aktif. Kecamatan yang tidak dikirim tidak
 * berubah. Perubahan tanpa efek tidak menaikkan version.
 */
export async function simpanPemetaan(masukan: {
  aktor: PenggunaSesi;
  periodeId: string;
  data: Pemetaan;
  konteks: KonteksRequest;
}): Promise<PemetaanApi> {
  const { aktor, periodeId, data, konteks } = masukan;
  await getDb().$transaction(async (tx) => {
    const periode = await tx.periode.findUnique({
      where: { id: periodeId },
      select: { status: true, version: true, wilayah: { select: { id: true, kode: true } } },
    });
    if (periode === null) {
      throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
    }
    if (periode.status !== 'DRAF') {
      throw new AppError(
        'PERIODE_TERKUNCI',
        409,
        'Periode sudah terkunci. Pemetaan wilayah tidak dapat diubah.',
        { status: periode.status },
      );
    }
    if (periode.version !== data.version) {
      throw new AppError(
        'CONFLICT',
        409,
        'Periode ini baru saja diubah orang lain. Muat ulang lalu coba lagi.',
        { version: periode.version },
      );
    }
    const lolos = await lolosPerKecamatanAktif(periodeId, tx);
    const tidakAda = data.pemetaan.filter((p) => !(p.kecamatan in lolos)).map((p) => p.kecamatan);
    if (tidakAda.length > 0) {
      throw new AppError('VALIDASI_GAGAL', 400, 'Kecamatan tidak ada di data peserta.', {
        fields: {
          pemetaan: `Kecamatan tidak ada di data peserta: ${tidakAda.slice(0, 5).join(', ')}.`,
        },
        kecamatanTidakDikenal: tidakAda,
      });
    }
    const idWilayah = new Map(periode.wilayah.map((w) => [w.kode, w.id]));
    const lama = await petaKecamatanWilayah(periodeId, tx);
    const berubah = data.pemetaan.filter((p) => (lama.get(p.kecamatan) ?? null) !== p.wilayah);
    if (berubah.length === 0) return;

    const naik = await tx.periode.updateMany({
      where: { id: periodeId, version: data.version, status: 'DRAF' },
      data: { version: { increment: 1 } },
    });
    if (naik.count === 0) {
      throw new AppError(
        'CONFLICT',
        409,
        'Periode ini baru saja diubah orang lain. Muat ulang lalu coba lagi.',
      );
    }
    for (const p of berubah) {
      await tx.kecamatanWilayah.upsert({
        where: { periodeId_kecamatan: { periodeId, kecamatan: p.kecamatan } },
        create: {
          periodeId,
          kecamatan: p.kecamatan,
          wilayahId: p.wilayah === null ? null : (idWilayah.get(p.wilayah) ?? null),
        },
        update: { wilayahId: p.wilayah === null ? null : (idWilayah.get(p.wilayah) ?? null) },
      });
    }
    await audit(tx, {
      aksi: 'WILAYAH_PETAKAN',
      aktor,
      targetTipe: 'periode',
      targetId: periodeId,
      payload: {
        jumlahDiubah: berubah.length,
        perubahan: berubah.slice(0, 50).map((p) => ({
          kecamatan: p.kecamatan,
          lama: lama.get(p.kecamatan) ?? null,
          baru: p.wilayah,
        })),
      },
      konteks,
    });
  });
  return ambilPemetaan(periodeId);
}
