import { strFromU8, unzipSync } from 'fflate';

import { sha256Hex } from '@/lib/package/hash';
import {
  ManifestSchema,
  MetaSchema,
  SnapshotSchema,
  ThemeConfigSchema,
  type MetaData,
} from '@/lib/package/kontrak';
import { type SnapshotData } from '@/lib/package/snapshot';
import { type ThemeConfig } from '@/lib/package/theme';
import { simpanPaketKeDb, type PaketTersimpan } from './db';

export type HasilValidasiPaket = {
  meta: MetaData;
  snapshot: SnapshotData;
  tema: ThemeConfig;
};

const PESAN_PAKET_RUSAK = 'Paket rusak atau telah diubah. Unduh ulang paket dari server.';

/**
 * Membuka paket .zip, memverifikasi integritas manifest dan hash seluruh file,
 * serta memvalidasi skema data secara ketat.
 */
export async function validasiDanMuatPaket(
  fileBytes: Uint8Array,
): Promise<HasilValidasiPaket> {
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(fileBytes);
  } catch {
    throw new Error(PESAN_PAKET_RUSAK);
  }

  // 1. Baca dan validasi manifest.json
  const manifestBytes = unzipped['manifest.json'];
  if (manifestBytes === undefined) {
    throw new Error(PESAN_PAKET_RUSAK);
  }

  let manifestObj: unknown;
  try {
    manifestObj = JSON.parse(strFromU8(manifestBytes));
  } catch {
    throw new Error(PESAN_PAKET_RUSAK);
  }

  const parseManifest = ManifestSchema.safeParse(manifestObj);
  if (!parseManifest.success) {
    throw new Error(PESAN_PAKET_RUSAK);
  }
  const manifest = parseManifest.data;

  // 2. Periksa kesesuaian daftar file dan hash masing-masing terhadap manifest
  for (const [namaPath, hashDiharapkan] of Object.entries(manifest.file)) {
    const bytesFile = unzipped[namaPath];
    if (bytesFile === undefined) {
      throw new Error(PESAN_PAKET_RUSAK);
    }
    const hashNyata = await sha256Hex(bytesFile);
    if (hashNyata !== hashDiharapkan) {
      throw new Error(PESAN_PAKET_RUSAK);
    }
  }

  // Pastikan tidak ada file asing di dalam zip selain manifest dan daftar di manifest
  for (const namaPath of Object.keys(unzipped)) {
    if (namaPath !== 'manifest.json' && manifest.file[namaPath] === undefined) {
      throw new Error(PESAN_PAKET_RUSAK);
    }
  }

  // 3. Baca dan validasi meta.json
  const metaBytes = unzipped['meta.json'];
  if (metaBytes === undefined) throw new Error(PESAN_PAKET_RUSAK);
  const parseMeta = MetaSchema.safeParse(JSON.parse(strFromU8(metaBytes)));
  if (!parseMeta.success) throw new Error(PESAN_PAKET_RUSAK);
  const meta = parseMeta.data;

  // 4. Baca dan validasi snapshot.json
  const snapshotBytes = unzipped['snapshot.json'];
  if (snapshotBytes === undefined) throw new Error(PESAN_PAKET_RUSAK);
  const snapshotRaw = strFromU8(snapshotBytes);
  const parseSnapshot = SnapshotSchema.safeParse(JSON.parse(snapshotRaw));
  if (!parseSnapshot.success) throw new Error(PESAN_PAKET_RUSAK);
  const snapshot = parseSnapshot.data;

  // Verifikasi hash snapshot terhadap meta.snapshotHash
  const hashSnapshotNyata = await sha256Hex(snapshotRaw);
  if (hashSnapshotNyata !== meta.snapshotHash) {
    throw new Error(PESAN_PAKET_RUSAK);
  }

  // 5. Baca dan validasi tema/theme.json
  const themeBytes = unzipped['tema/theme.json'];
  if (themeBytes === undefined) throw new Error(PESAN_PAKET_RUSAK);
  const themeRaw = strFromU8(themeBytes);
  const parseTema = ThemeConfigSchema.safeParse(JSON.parse(themeRaw));
  if (!parseTema.success) throw new Error(PESAN_PAKET_RUSAK);
  const tema = parseTema.data;

  // Verifikasi hash tema terhadap meta.temaConfigHash
  const hashTemaNyata = await sha256Hex(themeRaw);
  if (hashTemaNyata !== meta.temaConfigHash) {
    throw new Error(PESAN_PAKET_RUSAK);
  }

  // 6. Simpan ke IndexedDB
  const simpanan: PaketTersimpan = {
    periodeId: meta.periode.id,
    meta,
    snapshot,
    tema,
    dimuatAt: new Date().toISOString(),
  };

  try {
    await simpanPaketKeDb(simpanan);
  } catch (error) {
    const errObj = error as { name?: string };
    if (errObj.name === 'QuotaExceededError') {
      throw new Error('Penyimpanan browser penuh. Kosongkan ruang penyimpanan laptop acara.');
    }
    throw error;
  }

  return { meta, snapshot, tema };
}
