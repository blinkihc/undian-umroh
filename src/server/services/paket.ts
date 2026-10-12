import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { strToU8, zipSync } from 'fflate';

import { getEnv } from '@/config/env';
import { isoWib } from '@/lib/domain/waktu';
import { canonicalStringify, formatHashRingkas, sha256Hex } from '@/lib/package/hash';
import {
  SLOT_URUTAN,
  type ManifestData,
  type MetaData,
} from '@/lib/package/kontrak';
import { TEMA_DEFAULT } from '@/lib/package/theme';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';

export type InfoPaket = {
  status: string;
  terkunci: boolean;
  periode: { id: string; slug: string; judul: string };
  snapshot: {
    hash: string;
    hashRingkas: string;
    lockedAt: string;
    jumlahW1: number;
    jumlahW2: number;
  } | null;
  temaAktif: string;
  perkiraanUkuran: string;
  riwayatUnduhan: { at: string; oleh: string; paketSha256: string }[];
};

export type HasilUnduhPaket = {
  zipBuffer: Uint8Array;
  namaFile: string;
  paketSha256: string;
};

/**
 * Informasi paket undian untuk tampilan Tab Paket Undian (API.md §3, §4).
 */
export async function ambilInfoPaket(periodeId: string): Promise<InfoPaket> {
  const periode = await getDb().periode.findUnique({
    where: { id: periodeId },
    select: {
      id: true,
      slug: true,
      judul: true,
      status: true,
      snapshot: {
        select: {
          hash: true,
          lockedAt: true,
          jumlahW1: true,
          jumlahW2: true,
        },
      },
      paketUnduhan: {
        select: {
          createdAt: true,
          paketSha256: true,
          unduhBy: { select: { nama: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }

  const terkunci = periode.status === 'TERKUNCI' || periode.status === 'DIUNDI';

  return {
    status: periode.status,
    terkunci,
    periode: { id: periode.id, slug: periode.slug, judul: periode.judul },
    snapshot:
      periode.snapshot !== null
        ? {
            hash: periode.snapshot.hash,
            hashRingkas: formatHashRingkas(periode.snapshot.hash),
            lockedAt: isoWib(periode.snapshot.lockedAt),
            jumlahW1: periode.snapshot.jumlahW1,
            jumlahW2: periode.snapshot.jumlahW2,
          }
        : null,
    temaAktif: 'Default (Slot Mesin Bawaan)',
    perkiraanUkuran:
      periode.snapshot !== null
        ? `±${Math.max(1, Math.round(((periode.snapshot.jumlahW1 + periode.snapshot.jumlahW2) * 60) / 1024 / 1024)).toString()} MB`
        : '±2,5 MB',
    riwayatUnduhan: periode.paketUnduhan.map((p) => ({
      at: isoWib(p.createdAt),
      oleh: p.unduhBy.nama,
      paketSha256: p.paketSha256,
    })),
  };
}

/**
 * Menyusun dan mengalirkan file paket .zip untuk periode terkunci (API.md §4.2, Tiket 11).
 */
export async function buatPaketZip(masukan: {
  aktor: PenggunaSesi;
  periodeId: string;
  konteks: KonteksRequest;
}): Promise<HasilUnduhPaket> {
  const { aktor, periodeId, konteks } = masukan;

  const periode = await getDb().periode.findUnique({
    where: { id: periodeId },
    select: {
      id: true,
      slug: true,
      judul: true,
      status: true,
      tanggalAcara: true,
      lokasiAcara: true,
      snapshot: {
        select: {
          hash: true,
          filePath: true,
          jumlahW1: true,
          jumlahW2: true,
        },
      },
      wilayah: {
        select: { kode: true, nama: true },
        orderBy: { kode: 'asc' },
      },
    },
  });

  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }

  if (periode.status !== 'TERKUNCI' && periode.status !== 'DIUNDI') {
    throw new AppError(
      'PERIODE_BELUM_TERKUNCI',
      409,
      'Kunci data terlebih dahulu sebelum mengunduh paket undian.',
      { status: periode.status },
    );
  }

  if (periode.snapshot === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Snapshot peserta belum dibuat.');
  }

  const storageDir = getEnv().STORAGE_DIR;
  const snapshotPath = path.join(storageDir, periode.snapshot.filePath);
  let snapshotIsi: string;
  try {
    snapshotIsi = await fs.readFile(snapshotPath, 'utf-8');
  } catch {
    throw new AppError('FILE_TIDAK_DITEMUKAN', 500, 'File snapshot di penyimpanan tidak ditemukan.');
  }

  // Verifikasi ulang hash file snapshot kanonik
  const snapshotHashUlang = await sha256Hex(snapshotIsi);
  if (snapshotHashUlang !== periode.snapshot.hash) {
    throw new AppError(
      'INTEGRITAS_RUSAK',
      500,
      'Hash file snapshot di penyimpanan tidak sesuai dengan database.',
    );
  }

  // Siapkan tema default kanonik
  const temaKanonicJson = canonicalStringify(TEMA_DEFAULT);
  const temaConfigHash = await sha256Hex(temaKanonicJson);

  // Siapkan meta.json kanonik
  const metaData: MetaData = {
    versiFormat: 1,
    aplikasiVersi: '0.1.0',
    dibuatAt: isoWib(new Date()),
    periode: {
      id: periode.id,
      slug: periode.slug,
      judul: periode.judul,
      tanggalAcara:
        periode.tanggalAcara !== null ? periode.tanggalAcara.toISOString().slice(0, 10) : null,
      lokasiAcara: periode.lokasiAcara,
    },
    wilayah: periode.wilayah.map((w) => ({
      kode: w.kode,
      nama: w.nama,
      jumlahPeserta: w.kode === 'W1' ? (periode.snapshot?.jumlahW1 ?? 0) : (periode.snapshot?.jumlahW2 ?? 0),
    })),
    slot: [...SLOT_URUTAN],
    snapshotHash: periode.snapshot.hash,
    temaConfigHash,
  };

  const metaKanonicJson = canonicalStringify(metaData);
  const metaHash = await sha256Hex(metaKanonicJson);

  // Siapkan manifest.json kanonik
  const manifestData: ManifestData = {
    versiFormat: 1,
    file: {
      'meta.json': metaHash,
      'snapshot.json': periode.snapshot.hash,
      'tema/theme.json': temaConfigHash,
    },
  };

  const manifestKanonicJson = canonicalStringify(manifestData);

  // Kompresi seluruh file ke ZIP
  const zipBuffer = zipSync({
    'manifest.json': strToU8(manifestKanonicJson),
    'meta.json': strToU8(metaKanonicJson),
    'snapshot.json': strToU8(snapshotIsi),
    'tema/theme.json': strToU8(temaKanonicJson),
  });

  const batasMaksByte = 25 * 1024 * 1024;
  if (zipBuffer.byteLength > batasMaksByte) {
    throw new AppError(
      'UKURAN_MELEBIHI_BATAS',
      500,
      'Ukuran paket melebihi batas maksimal 25 MB.',
    );
  }

  const paketSha256 = await sha256Hex(zipBuffer);
  const namaFile = `paket-undian-${periode.slug}-${periode.snapshot.hash.slice(0, 8)}.zip`;

  // Catat riwayat unduhan
  await getDb().paketUnduhan.create({
    data: {
      periodeId: periode.id,
      snapshotHash: periode.snapshot.hash,
      temaConfigHash,
      paketSha256,
      unduhById: aktor.id,
    },
  });

  await audit(getDb(), {
    aksi: 'PAKET_UNDUH',
    aktor,
    targetTipe: 'periode',
    targetId: periode.id,
    payload: {
      snapshotHash: periode.snapshot.hash,
      temaConfigHash,
      paketSha256,
      namaFile,
    },
    konteks,
  });

  return {
    zipBuffer,
    namaFile,
    paketSha256,
  };
}
