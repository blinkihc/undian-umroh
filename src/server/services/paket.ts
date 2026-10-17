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
import { TEMA_DEFAULT, ThemeConfigSchema, type ThemeConfig } from '@/lib/package/theme';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';
import { pastikanTemaDanAsetBawaan } from '@/server/services/tema';

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
  temaId: string | null;
  temaAktif: string;
  daftarTema: { id: string; nama: string; bawaan: boolean }[];
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
  const db = getDb();
  const hitungTema = await db.tema.count();
  if (hitungTema < 4) {
    await pastikanTemaDanAsetBawaan(db);
  }

  const [periode, daftarTema] = await Promise.all([
    db.periode.findUnique({
      where: { id: periodeId },
      select: {
        id: true,
        slug: true,
        judul: true,
        status: true,
        temaId: true,
        tema: {
          select: { nama: true },
        },
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
    }),
    db.tema.findMany({
      select: {
        id: true,
        nama: true,
        bawaan: true,
      },
      orderBy: [{ bawaan: 'desc' }, { createdAt: 'asc' }],
    }),
  ]);

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
    temaId: periode.temaId,
    temaAktif: periode.tema?.nama ?? daftarTema[0]?.nama ?? 'Default (Slot Mesin Bawaan)',
    daftarTema,
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
 * Menyusun dan mengalirkan file paket .zip untuk periode terkunci (API.md §4.2, Tiket 11 & Tiket 23).
 */
export async function buatPaketZip(masukan: {
  aktor: PenggunaSesi;
  periodeId: string;
  konteks: KonteksRequest;
}): Promise<HasilUnduhPaket> {
  const { aktor, periodeId, konteks } = masukan;
  const db = getDb();

  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    select: {
      id: true,
      slug: true,
      judul: true,
      status: true,
      tanggalAcara: true,
      lokasiAcara: true,
      tema: {
        select: {
          config: true,
          nama: true,
        },
      },
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

  // Siapkan tema: gunakan tema periode jika ada, atau tema bawaan aktif di database, atau fallback ke TEMA_DEFAULT
  let temaConfig: ThemeConfig = TEMA_DEFAULT;
  if (periode.tema?.config) {
    try {
      temaConfig = ThemeConfigSchema.parse(periode.tema.config);
    } catch {
      temaConfig = TEMA_DEFAULT;
    }
  } else {
    const temaPertama = await db.tema.findFirst({
      orderBy: [{ bawaan: 'desc' }, { createdAt: 'asc' }],
    });
    if (temaPertama?.config) {
      try {
        temaConfig = ThemeConfigSchema.parse(temaPertama.config);
      } catch {
        temaConfig = TEMA_DEFAULT;
      }
    }
  }

  const temaKanonicJson = canonicalStringify(temaConfig);
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

  // Kumpulkan semua aset yang dirujuk oleh tema
  const daftarAsetId: string[] = [];
  if (temaConfig.tampilan.latarAsetId) daftarAsetId.push(temaConfig.tampilan.latarAsetId);
  if (temaConfig.audio.menunggu.asetId) daftarAsetId.push(temaConfig.audio.menunggu.asetId);
  if (temaConfig.audio.mengacak.asetId) daftarAsetId.push(temaConfig.audio.mengacak.asetId);
  if (temaConfig.audio.pemenang.asetId) daftarAsetId.push(temaConfig.audio.pemenang.asetId);

  const asetDatabase =
    daftarAsetId.length > 0
      ? await db.aset.findMany({
          where: { id: { in: daftarAsetId } },
          select: { id: true, sha256: true, mime: true },
        })
      : [];

  const manifestFiles: Record<string, string> = {
    'meta.json': metaHash,
    'snapshot.json': periode.snapshot.hash,
    'tema/theme.json': temaConfigHash,
  };

  const berkasZip: Record<string, Uint8Array> = {
    'manifest.json': new Uint8Array(), // akan diisi setelah manifest lengkap
    'meta.json': strToU8(metaKanonicJson),
    'snapshot.json': strToU8(snapshotIsi),
    'tema/theme.json': strToU8(temaKanonicJson),
  };

  // Muat dan tambahkan berkas aset ke paket zip
  for (const aset of asetDatabase) {
    const ext = aset.mime.includes('png')
      ? 'png'
      : aset.mime.includes('jpeg')
        ? 'jpg'
        : aset.mime.includes('webp')
          ? 'webp'
          : aset.mime.includes('ogg')
            ? 'ogg'
            : aset.mime.includes('wav')
              ? 'wav'
              : 'mp3';

    const namaPathRelatif = `tema/aset/${aset.sha256}.${ext}`;
    const filePathFisik = path.join(storageDir, 'aset', `${aset.sha256}.${ext}`);

    try {
      const buffer = await fs.readFile(filePathFisik);
      berkasZip[namaPathRelatif] = new Uint8Array(buffer);
      manifestFiles[namaPathRelatif] = aset.sha256;
    } catch {
      // Jika berkas aset belum ada di disk (misal di lingkungan uji), abaikan agar undian tetap jalan
    }
  }

  // Siapkan manifest.json kanonik
  const manifestData: ManifestData = {
    versiFormat: 1,
    file: manifestFiles,
  };

  const manifestKanonicJson = canonicalStringify(manifestData);
  berkasZip['manifest.json'] = strToU8(manifestKanonicJson);

  // Kompresi seluruh file ke ZIP
  const zipBuffer = zipSync(berkasZip);

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
  await db.paketUnduhan.create({
    data: {
      periodeId: periode.id,
      snapshotHash: periode.snapshot.hash,
      temaConfigHash,
      paketSha256,
      unduhById: aktor.id,
    },
  });

  await audit(db, {
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
