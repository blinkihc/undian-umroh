import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { getEnv } from '@/config/env';
import { maskNop } from '@/lib/domain/nop';
import { isoWib } from '@/lib/domain/waktu';
import { canonicalStringify, formatHashRingkas, sha256Hex } from '@/lib/package/hash';
import { type SnapshotData } from '@/lib/package/snapshot';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';
import { petaKecamatanWilayah } from '@/server/services/wilayah';

/** Masukan `POST /api/periode/:id/kunci` (API.md §3 Kunci, Paket, Hasil). */
export const KunciPeriodeSchema = z.strictObject({
  version: z.number().int().min(1),
  konfirmasiJudul: z.string().trim().min(1, 'Konfirmasi judul wajib diisi.'),
});

export type KunciPeriode = z.infer<typeof KunciPeriodeSchema>;

export const BukaKunciPeriodeSchema = z.strictObject({
  version: z.number().int().min(1),
  alasan: z
    .string({ error: 'Alasan buka kunci wajib diisi.' })
    .trim()
    .min(5, 'Alasan buka kunci minimal 5 karakter.')
    .max(500, 'Alasan buka kunci maksimal 500 karakter.'),
});

export type BukaKunciPeriode = z.infer<typeof BukaKunciPeriodeSchema>;

export type PrasyaratKunci = {
  semuaKecamatanTerpetakan: boolean;
  kecamatanBelumDipetakan: number;
  tanpaNopGanda: boolean;
  nopGanda: number;
  pesertaCukup: boolean;
  wilayahKurangPeserta: ('W1' | 'W2')[];
  jumlahPeserta: { W1: number; W2: number };
  siapKunci: boolean;
  status: string;
  snapshot: {
    hash: string;
    hashRingkas: string;
    lockedAt: string;
    jumlahW1: number;
    jumlahW2: number;
  } | null;
  version: number;
  judul: string;
};

export type HasilKunci = {
  status: 'TERKUNCI';
  snapshotHash: string;
  jumlah: { W1: number; W2: number };
  lockedAt: string;
  version: number;
};

/** Opsi batas waktu transaksi untuk operasi kunci dengan dataset besar (>100.000 baris). */
const OPSI_TRANSAKSI_KUNCI = { timeout: 600_000, maxWait: 60_000 } as const;

/**
 * Membaca prasyarat penguncian untuk tampilan checklist di tab Kunci Data (PRD F3).
 */
export async function ambilPrasyaratKunci(periodeId: string): Promise<PrasyaratKunci> {
  const periode = await getDb().periode.findUnique({
    where: { id: periodeId },
    select: {
      id: true,
      judul: true,
      status: true,
      version: true,
      snapshot: {
        select: {
          hash: true,
          lockedAt: true,
          jumlahW1: true,
          jumlahW2: true,
        },
      },
    },
  });

  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }

  if (periode.snapshot !== null) {
    return {
      semuaKecamatanTerpetakan: true,
      kecamatanBelumDipetakan: 0,
      tanpaNopGanda: true,
      nopGanda: 0,
      pesertaCukup: true,
      wilayahKurangPeserta: [],
      jumlahPeserta: { W1: periode.snapshot.jumlahW1, W2: periode.snapshot.jumlahW2 },
      siapKunci: false,
      status: periode.status,
      snapshot: {
        hash: periode.snapshot.hash,
        hashRingkas: formatHashRingkas(periode.snapshot.hash),
        lockedAt: isoWib(periode.snapshot.lockedAt),
        jumlahW1: periode.snapshot.jumlahW1,
        jumlahW2: periode.snapshot.jumlahW2,
      },
      version: periode.version,
      judul: periode.judul,
    };
  }

  const imporAktif = await getDb().impor.findFirst({
    where: { periodeId, aktif: true },
    select: { id: true, ringkasan: true },
  });

  if (imporAktif === null) {
    return {
      semuaKecamatanTerpetakan: false,
      kecamatanBelumDipetakan: 0,
      tanpaNopGanda: true,
      nopGanda: 0,
      pesertaCukup: false,
      wilayahKurangPeserta: ['W1', 'W2'],
      jumlahPeserta: { W1: 0, W2: 0 },
      siapKunci: false,
      status: periode.status,
      snapshot: null,
      version: periode.version,
      judul: periode.judul,
    };
  }

  const ringkasan = imporAktif.ringkasan as { nopGanda?: number };
  const nopGanda = ringkasan.nopGanda ?? 0;

  const semuaKecamatan = await getDb().kecamatanWilayah.findMany({
    where: { periodeId },
    select: { wilayahId: true },
  });
  const kecamatanBelumDipetakan = semuaKecamatan.filter((k) => k.wilayahId === null).length;

  const peta = await petaKecamatanWilayah(periodeId);
  const rekapKecamatan = await getDb().peserta.groupBy({
    by: ['kecamatan'],
    where: { periodeId, eligible: true },
    _count: { _all: true },
  });

  let jumlahW1 = 0;
  let jumlahW2 = 0;
  for (const item of rekapKecamatan) {
    const wil = peta.get(item.kecamatan);
    if (wil === 'W1') jumlahW1 += item._count._all;
    else if (wil === 'W2') jumlahW2 += item._count._all;
  }

  const wilayahKurangPeserta: ('W1' | 'W2')[] = [];
  if (jumlahW1 < 3) wilayahKurangPeserta.push('W1');
  if (jumlahW2 < 3) wilayahKurangPeserta.push('W2');

  const semuaKecamatanTerpetakan = kecamatanBelumDipetakan === 0 && semuaKecamatan.length > 0;
  const tanpaNopGanda = nopGanda === 0;
  const pesertaCukup = wilayahKurangPeserta.length === 0;
  const siapKunci =
    periode.status === 'DRAF' && semuaKecamatanTerpetakan && tanpaNopGanda && pesertaCukup;

  return {
    semuaKecamatanTerpetakan,
    kecamatanBelumDipetakan,
    tanpaNopGanda,
    nopGanda,
    pesertaCukup,
    wilayahKurangPeserta,
    jumlahPeserta: { W1: jumlahW1, W2: jumlahW2 },
    siapKunci,
    status: periode.status,
    snapshot: null,
    version: periode.version,
    judul: periode.judul,
  };
}

/**
 * Mengunci snapshot peserta periode (Tiket 10, PRD F3, API.md §3).
 */
export async function kunciPeriode(masukan: {
  aktor: PenggunaSesi;
  id: string;
  data: KunciPeriode;
  konteks: KonteksRequest;
}): Promise<HasilKunci> {
  const { aktor, id, data, konteks } = masukan;

  return getDb().$transaction(async (tx) => {
    // Kunci advisory lock agar dua permintaan bersamaan diproses sekuensial (yang kedua mendapat 409).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('periode:kunci:' || ${id}))`;

    const periode = await tx.periode.findUnique({
      where: { id },
      select: {
        id: true,
        judul: true,
        status: true,
        version: true,
        batasLunas: true,
        snapshot: { select: { id: true } },
      },
    });

    if (periode === null) {
      throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
    }
    if (periode.status !== 'DRAF' || periode.snapshot !== null) {
      throw new AppError('PERIODE_TERKUNCI', 409, 'Periode sudah terkunci.', {
        status: periode.status,
      });
    }
    if (periode.version !== data.version) {
      throw new AppError(
        'CONFLICT',
        409,
        'Periode ini baru saja diubah orang lain. Muat ulang lalu coba lagi.',
        { version: periode.version },
      );
    }
    if (data.konfirmasiJudul !== periode.judul) {
      throw new AppError(
        'VALIDASI_GAGAL',
        400,
        'Konfirmasi judul harus sama persis dengan judul periode.',
      );
    }

    const imporAktif = await tx.impor.findFirst({
      where: { periodeId: id, aktif: true },
      select: { id: true, ringkasan: true },
    });
    if (imporAktif === null) {
      throw new AppError(
        'PRASYARAT_KUNCI_BELUM_LENGKAP',
        422,
        'Prasyarat penguncian belum terpenuhi: belum ada data peserta yang diimpor.',
        { kecamatanBelumDipetakan: 0, nopGanda: 0, wilayahKurangPeserta: ['W1', 'W2'] },
      );
    }

    const ringkasan = imporAktif.ringkasan as { nopGanda?: number };
    const nopGanda = ringkasan.nopGanda ?? 0;

    const petaWilayah = await petaKecamatanWilayah(id, tx);
    const semuaKecamatan = await tx.kecamatanWilayah.findMany({
      where: { periodeId: id },
      select: { wilayahId: true },
    });
    const kecamatanBelumDipetakan = semuaKecamatan.filter((k) => k.wilayahId === null).length;

    const barisPesertaLolos = await tx.peserta.findMany({
      where: { periodeId: id, eligible: true },
      orderBy: { nop: 'asc' },
      select: {
        id: true,
        nop: true,
        nikMasked: true,
        nama: true,
        alamatWp: true,
        alamatOp: true,
        kecamatan: true,
        kelurahan: true,
        lunas2022: true,
        lunas2023: true,
        lunas2024: true,
        lunas2025: true,
        lunas2026: true,
      },
    });

    let jumlahW1 = 0;
    let jumlahW2 = 0;
    const pesertaDenganWilayah: (typeof barisPesertaLolos[0] & { wilayah: 'W1' | 'W2' })[] = [];

    for (const p of barisPesertaLolos) {
      const wil = petaWilayah.get(p.kecamatan);
      if (wil === 'W1') {
        jumlahW1 += 1;
        pesertaDenganWilayah.push({ ...p, wilayah: 'W1' });
      } else if (wil === 'W2') {
        jumlahW2 += 1;
        pesertaDenganWilayah.push({ ...p, wilayah: 'W2' });
      }
    }

    const wilayahKurangPeserta: ('W1' | 'W2')[] = [];
    if (jumlahW1 < 3) wilayahKurangPeserta.push('W1');
    if (jumlahW2 < 3) wilayahKurangPeserta.push('W2');

    if (kecamatanBelumDipetakan > 0 || nopGanda > 0 || wilayahKurangPeserta.length > 0) {
      throw new AppError(
        'PRASYARAT_KUNCI_BELUM_LENGKAP',
        422,
        'Prasyarat penguncian belum terpenuhi.',
        {
          kecamatanBelumDipetakan,
          nopGanda,
          wilayahKurangPeserta,
        },
      );
    }

    // Urutan NOP naik (1..N).
    pesertaDenganWilayah.sort((a, b) => a.nop.localeCompare(b.nop));

    const snapshotData: SnapshotData = {
      versiFormat: 1,
      periodeId: id,
      batasLunas: isoWib(periode.batasLunas),
      peserta: pesertaDenganWilayah.map((p, idx) => ({
        urut: idx + 1,
        wilayah: p.wilayah,
        nopMasked: maskNop(p.nop),
        nikMasked: p.nikMasked,
        nama: p.nama,
        alamatWp: p.alamatWp,
        alamatOp: p.alamatOp,
        kecamatan: p.kecamatan,
        kelurahan: p.kelurahan,
        lunas: [
          p.lunas2022 ? isoWib(p.lunas2022) : '',
          p.lunas2023 ? isoWib(p.lunas2023) : '',
          p.lunas2024 ? isoWib(p.lunas2024) : '',
          p.lunas2025 ? isoWib(p.lunas2025) : '',
          p.lunas2026 ? isoWib(p.lunas2026) : '',
        ],
      })),
    };

    const canonicalJson = canonicalStringify(snapshotData);
    const hash = await sha256Hex(canonicalJson);

    // Tulis file snapshot kanonik ke storage
    const storageDir = getEnv().STORAGE_DIR;
    const relPath = `snapshot/${id}.json`;
    const fullPath = path.join(storageDir, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, canonicalJson, 'utf-8');

    const lockedAt = new Date();
    const snapshot = await tx.snapshot.create({
      data: {
        periodeId: id,
        hash,
        jumlahW1,
        jumlahW2,
        filePath: relPath,
        lockedById: aktor.id,
        lockedAt,
      },
    });

    const BATCH_SIZE = 2500;
    const itemsPeserta = pesertaDenganWilayah.map((p, idx) => ({
      snapshotId: snapshot.id,
      urut: idx + 1,
      pesertaId: p.id,
      nop: p.nop,
      wilayah: p.wilayah,
    }));
    for (let awal = 0; awal < itemsPeserta.length; awal += BATCH_SIZE) {
      await tx.snapshotPeserta.createMany({
        data: itemsPeserta.slice(awal, awal + BATCH_SIZE),
      });
    }

    const updated = await tx.periode.update({
      where: { id },
      data: {
        status: 'TERKUNCI',
        version: { increment: 1 },
      },
    });

    await audit(tx, {
      aksi: 'PERIODE_KUNCI',
      aktor,
      targetTipe: 'periode',
      targetId: id,
      payload: {
        snapshotHash: hash,
        jumlah: { W1: jumlahW1, W2: jumlahW2 },
      },
      konteks,
    });

    return {
      status: 'TERKUNCI',
      snapshotHash: hash,
      jumlah: { W1: jumlahW1, W2: jumlahW2 },
      lockedAt: isoWib(lockedAt),
      version: updated.version,
    };
  }, OPSI_TRANSAKSI_KUNCI);
}

export async function bukaKunciPeriode(masukan: {
  periodeId: string;
  data: { version: number; alasan: string };
  aktor: PenggunaSesi;
  konteks?: KonteksRequest;
}): Promise<{ ok: true; status: 'DRAF'; version: number }> {
  const { periodeId, data, aktor, konteks } = masukan;
  const db = getDb();

  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    select: {
      id: true,
      status: true,
      version: true,
      snapshot: { select: { id: true, filePath: true, hash: true } },
      hasilUndian: { select: { id: true } },
    },
  });

  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }

  if (periode.status !== 'TERKUNCI') {
    throw new AppError(
      'STATUS_PERIODE_TIDAK_VALID',
      409,
      'Hanya periode berstatus Terkunci yang dapat dibuka kuncinya.',
      { status: periode.status },
    );
  }

  if (periode.hasilUndian !== null) {
    throw new AppError(
      'AKSI_TIDAK_VALID',
      409,
      'Periode yang sudah diundi tidak dapat dibuka kuncinya secara langsung. Batalkan hasil undian terlebih dahulu.',
    );
  }

  if (periode.version !== data.version) {
    throw new AppError(
      'CONFLICT',
      409,
      'Data periode telah diubah orang lain. Muat ulang lalu coba lagi.',
      { serverVersion: periode.version },
    );
  }

  const snapshotHash = periode.snapshot?.hash;
  const snapshotFilePath = periode.snapshot?.filePath;

  const hasilTx = await db.$transaction(async (tx) => {
    const terkini = await tx.periode.findUniqueOrThrow({
      where: { id: periodeId },
      select: { id: true, status: true, version: true },
    });

    if (terkini.status !== 'TERKUNCI') {
      throw new AppError('STATUS_PERIODE_TIDAK_VALID', 409, 'Status periode telah berubah.');
    }

    if (terkini.version !== data.version) {
      throw new AppError('CONFLICT', 409, 'Konflik versi data periode.');
    }

    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica';");
    await tx.$executeRaw`DELETE FROM "paket_unduhan" WHERE "periode_id" = ${periodeId};`;
    await tx.$executeRaw`DELETE FROM "snapshot_peserta" WHERE "snapshot_id" IN (SELECT "id" FROM "snapshot" WHERE "periode_id" = ${periodeId});`;
    await tx.$executeRaw`DELETE FROM "snapshot" WHERE "periode_id" = ${periodeId};`;
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'origin';");

    const updated = await tx.periode.update({
      where: { id: periodeId },
      data: {
        status: 'DRAF',
        version: { increment: 1 },
      },
      select: { version: true },
    });

    await audit(tx, {
      aksi: 'PERIODE_BUKA_KUNCI',
      aktor,
      targetTipe: 'periode',
      targetId: periodeId,
      payload: {
        alasan: data.alasan,
        snapshotHash,
      },
      konteks,
    });

    return { version: updated.version };
  }, OPSI_TRANSAKSI_KUNCI);

  if (snapshotFilePath) {
    try {
      const storageDir = getEnv().STORAGE_DIR;
      const fullPath = path.join(storageDir, snapshotFilePath);
      await fs.unlink(fullPath);
    } catch {
      // Pengabaian jika berkas fisik tidak ada
    }
  }

  return {
    ok: true,
    status: 'DRAF',
    version: hasilTx.version,
  };
}
