import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { getEnv } from '@/config/env';
import { canonicalStringify, sha256Hex } from '@/lib/package/hash';
import { TEMA_DEFAULT, ThemeConfigSchema, type ThemeConfig } from '@/lib/package/theme';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb, type DbClient } from '@/server/db';
import { AppError } from '@/server/errors';
import { deteksiDanValidasiFormat } from '@/server/magic-bytes';
import { type KonteksRequest } from '@/server/request';

// ID aset & tema bawaan sistem (DATABASE §3, Tiket 23)
export const ID_ASET_MENUNGGU_BAWAAN = 'aset_bawaan_menunggu_1';
export const ID_ASET_DRUMROLL_BAWAAN = 'aset_bawaan_drumroll_1';
export const ID_ASET_FANFARE_BAWAAN = 'aset_bawaan_fanfare_1';
export const ID_ASET_LATAR_BAWAAN = 'aset_bawaan_latar_1';
export const ID_TEMA_DEFAULT = 'tema_bawaan_slot_mesin';
export const ID_TEMA_RODA_NAMA = 'tema_bawaan_roda_nama';
export const ID_TEMA_KARTU_BERPUTAR = 'tema_bawaan_kartu_berputar';
export const ID_TEMA_TICKER_NOP = 'tema_bawaan_ticker_nop';

export const DAFTAR_PRESET_TEMA_BAWAAN = [
  {
    id: ID_TEMA_DEFAULT,
    nama: 'Slot Mesin (Bawaan)',
    preset: 'slot-mesin' as const,
  },
  {
    id: ID_TEMA_RODA_NAMA,
    nama: 'Roda Nama (Bawaan)',
    preset: 'roda-nama' as const,
  },
  {
    id: ID_TEMA_KARTU_BERPUTAR,
    nama: 'Kartu Berputar (Bawaan)',
    preset: 'kartu-berputar' as const,
  },
  {
    id: ID_TEMA_TICKER_NOP,
    nama: 'Ticker NOP (Bawaan)',
    preset: 'ticker-nop' as const,
  },
];

// Buffer placeholder valid minimal dengan isi unik
const MP3_MENUNGGU = Buffer.from([
  0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
  0xff, 0xfb, 0x90, 0x64, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const MP3_DRUMROLL = Buffer.from([
  0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02,
  0xff, 0xfb, 0x90, 0x64, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const MP3_FANFARE = Buffer.from([
  0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
  0xff, 0xfb, 0x90, 0x64, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const WEBP_MINIMAL = Buffer.from(
  'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
  'base64',
);

/**
 * Memastikan tabel aset dan tema memiliki data bawaan resmi (idempoten).
 */
export async function pastikanTemaDanAsetBawaan(db: DbClient, adminId?: string): Promise<void> {
  const storageDir = getEnv().STORAGE_DIR;
  const asetDir = path.join(storageDir, 'aset');
  await fs.mkdir(asetDir, { recursive: true });

  const hashMenunggu = await sha256Hex(MP3_MENUNGGU);
  const hashDrumroll = await sha256Hex(MP3_DRUMROLL);
  const hashFanfare = await sha256Hex(MP3_FANFARE);
  const hashWebp = await sha256Hex(WEBP_MINIMAL);

  // Tulis berkas fisik placeholder
  await fs.writeFile(path.join(asetDir, `${hashMenunggu}.mp3`), MP3_MENUNGGU);
  await fs.writeFile(path.join(asetDir, `${hashDrumroll}.mp3`), MP3_DRUMROLL);
  await fs.writeFile(path.join(asetDir, `${hashFanfare}.mp3`), MP3_FANFARE);
  await fs.writeFile(path.join(asetDir, `${hashWebp}.webp`), WEBP_MINIMAL);

  // 1. Aset Audio Menunggu Bawaan
  await db.aset.upsert({
    where: { id: ID_ASET_MENUNGGU_BAWAAN },
    create: {
      id: ID_ASET_MENUNGGU_BAWAAN,
      jenis: 'AUDIO',
      fase: 'MENUNGGU',
      nama: 'Audio Menunggu (Bawaan)',
      deskripsi: 'Musik latar tenang fase menunggu pengundian',
      mime: 'audio/mpeg',
      ukuran: MP3_MENUNGGU.length,
      sha256: hashMenunggu,
      durasiDetik: 5,
      lisensi: 'Bebas Royalti / Domain Publik (Placeholder resmi Bapenda)',
      bawaan: true,
      createdById: adminId ?? null,
    },
    update: {},
  });

  // 2. Aset Audio Drumroll Mengacak Bawaan
  await db.aset.upsert({
    where: { id: ID_ASET_DRUMROLL_BAWAAN },
    create: {
      id: ID_ASET_DRUMROLL_BAWAAN,
      jenis: 'AUDIO',
      fase: 'MENGACAK',
      nama: 'Drumroll Mengacak (Bawaan)',
      deskripsi: 'Efek suara putaran slot mesin cepat',
      mime: 'audio/mpeg',
      ukuran: MP3_DRUMROLL.length,
      sha256: hashDrumroll,
      durasiDetik: 3,
      lisensi: 'Bebas Royalti / Domain Publik (Placeholder resmi Bapenda)',
      bawaan: true,
      createdById: adminId ?? null,
    },
    update: {},
  });

  // 3. Aset Audio Fanfare Pemenang Bawaan
  await db.aset.upsert({
    where: { id: ID_ASET_FANFARE_BAWAAN },
    create: {
      id: ID_ASET_FANFARE_BAWAAN,
      jenis: 'AUDIO',
      fase: 'PEMENANG',
      nama: 'Fanfare Kemenangan (Bawaan)',
      deskripsi: 'Efek suara kemenangan pengundian',
      mime: 'audio/mpeg',
      ukuran: MP3_FANFARE.length,
      sha256: hashFanfare,
      durasiDetik: 4,
      lisensi: 'Bebas Royalti / Domain Publik (Placeholder resmi Bapenda)',
      bawaan: true,
      createdById: adminId ?? null,
    },
    update: {},
  });

  // 4. Aset Gambar Latar Bawaan
  await db.aset.upsert({
    where: { id: ID_ASET_LATAR_BAWAAN },
    create: {
      id: ID_ASET_LATAR_BAWAAN,
      jenis: 'GAMBAR',
      fase: null,
      nama: 'Latar Resmi OKU Selatan (Bawaan)',
      deskripsi: 'Latar belakang resmi dengan ornamen Kabupaten OKU Selatan',
      mime: 'image/webp',
      ukuran: WEBP_MINIMAL.length,
      sha256: hashWebp,
      lisensi: 'Hak Cipta Pemerintah Kabupaten OKU Selatan',
      bawaan: true,
      createdById: adminId ?? null,
    },
    update: {},
  });

  // 5. Seluruh 4 Preset Tema Bawaan
  // Ambil user pertama sebagai creator jika adminId tidak dispesifikasikan
  let creatorId = adminId;
  if (!creatorId) {
    const adminUser = await db.pengguna.findFirst({ select: { id: true } });
    if (adminUser) creatorId = adminUser.id;
  }

  if (creatorId) {
    for (const item of DAFTAR_PRESET_TEMA_BAWAAN) {
      const configItem: ThemeConfig = {
        ...TEMA_DEFAULT,
        animasi: {
          ...TEMA_DEFAULT.animasi,
          preset: item.preset,
        },
      };
      const configJson = canonicalStringify(configItem);
      const configHash = await sha256Hex(configJson);

      await db.tema.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          nama: item.nama,
          config: configItem as unknown as object,
          configHash,
          sumber: 'MANUAL',
          bawaan: true,
          createdById: creatorId,
          updatedById: creatorId,
        },
        update: {},
      });
    }
  }
}

/**
 * Memvalidasi bahwa setiap aset yang dirujuk oleh konfigurasi tema ada di database dan tipenya sesuai.
 */
export async function validasiAsetTema(config: ThemeConfig, db: DbClient = getDb()): Promise<void> {
  const asetIds: { id: string; jenisDiharapkan: 'AUDIO' | 'GAMBAR'; label: string }[] = [];

  if (config.tampilan.latarAsetId !== null) {
    asetIds.push({ id: config.tampilan.latarAsetId, jenisDiharapkan: 'GAMBAR', label: 'Latar' });
  }
  if (config.audio.menunggu.asetId !== null) {
    asetIds.push({ id: config.audio.menunggu.asetId, jenisDiharapkan: 'AUDIO', label: 'Audio Menunggu' });
  }
  if (config.audio.mengacak.asetId !== null) {
    asetIds.push({ id: config.audio.mengacak.asetId, jenisDiharapkan: 'AUDIO', label: 'Audio Mengacak' });
  }
  if (config.audio.pemenang.asetId !== null) {
    asetIds.push({ id: config.audio.pemenang.asetId, jenisDiharapkan: 'AUDIO', label: 'Audio Pemenang' });
  }

  for (const item of asetIds) {
    const aset = await db.aset.findUnique({
      where: { id: item.id },
      select: { id: true, jenis: true },
    });
    if (aset === null) {
      throw new AppError('TIDAK_DITEMUKAN', 400, `Aset ${item.label} (ID: ${item.id}) tidak ditemukan.`);
    }
    if (aset.jenis !== item.jenisDiharapkan) {
      throw new AppError(
        'FILE_TIDAK_VALID',
        400,
        `Jenis aset ${item.label} tidak sesuai. Diharapkan ${item.jenisDiharapkan}, ditemukan ${aset.jenis}.`,
      );
    }
  }
}

/**
 * Menyimpan atau mengunggah aset baru ke server (SECURITY §8, Tiket 23).
 */
export async function simpanAset(masukan: {
  buffer: Buffer;
  nama: string;
  deskripsi: string;
  lisensi: string;
  jenis: 'AUDIO' | 'GAMBAR';
  fase?: 'MENUNGGU' | 'MENGACAK' | 'PEMENANG';
  durasiDetik?: number;
  aktor: PenggunaSesi;
  konteks?: KonteksRequest;
}) {
  const { buffer, nama, deskripsi, lisensi, jenis, fase, durasiDetik, aktor, konteks } = masukan;

  // 1. Validasi format dan ukuran via magic bytes
  const infoFormat = deteksiDanValidasiFormat(buffer, jenis);

  // 2. Hitung sha256
  const sha256 = await sha256Hex(buffer);

  // 3. Simpan fisik ke storage/aset/<sha256>.<ext>
  const storageDir = getEnv().STORAGE_DIR;
  const asetDir = path.join(storageDir, 'aset');
  await fs.mkdir(asetDir, { recursive: true });
  const namaBerkas = `${sha256}.${infoFormat.ekstensi}`;
  await fs.writeFile(path.join(asetDir, namaBerkas), buffer);

  // 4. Catat ke database (jika sudah ada sha256 sama, kembalikan yang ada)
  const db = getDb();
  const ada = await db.aset.findUnique({ where: { sha256 } });
  if (ada !== null) {
    return ada;
  }

  const asetBaru = await db.aset.create({
    data: {
      jenis,
      fase: jenis === 'AUDIO' ? (fase ?? null) : null,
      nama,
      deskripsi,
      mime: infoFormat.mime,
      ukuran: buffer.length,
      sha256,
      durasiDetik: durasiDetik !== undefined ? durasiDetik : null,
      lisensi,
      bawaan: false,
      createdById: aktor.id,
    },
  });

  await audit(db, {
    aksi: 'ASET_UNGGAH',
    aktor,
    targetTipe: 'aset',
    targetId: asetBaru.id,
    payload: { nama, sha256, jenis, ukuran: buffer.length },
    konteks,
  });

  return asetBaru;
}

/**
 * Menghapus aset dari sistem.
 * Dilarang menghapus aset bawaan atau aset yang sedang dirujuk oleh konfigurasi tema apa pun.
 */
export async function hapusAset(asetId: string, aktor: PenggunaSesi, konteks?: KonteksRequest): Promise<void> {
  const db = getDb();
  const aset = await db.aset.findUnique({ where: { id: asetId } });

  if (aset === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Aset tidak ditemukan.');
  }

  if (aset.bawaan) {
    throw new AppError('AKSI_TIDAK_VALID', 400, 'Aset bawaan sistem tidak dapat dihapus.');
  }

  // Periksa apakah dirujuk oleh tema mana pun
  const semuaTema = await db.tema.findMany({ select: { id: true, nama: true, config: true } });
  for (const tema of semuaTema) {
    const cfg = tema.config as unknown as ThemeConfig;
    if (
      cfg.tampilan?.latarAsetId === asetId ||
      cfg.audio?.menunggu?.asetId === asetId ||
      cfg.audio?.mengacak?.asetId === asetId ||
      cfg.audio?.pemenang?.asetId === asetId
    ) {
      throw new AppError(
        'AKSI_TIDAK_VALID',
        400,
        `Aset sedang digunakan oleh tema "${tema.nama}" dan tidak dapat dihapus.`,
      );
    }
  }

  await db.aset.delete({ where: { id: asetId } });

  await audit(db, {
    aksi: 'ASET_HAPUS',
    aktor,
    targetTipe: 'aset',
    targetId: asetId,
    payload: { nama: aset.nama, sha256: aset.sha256 },
    konteks,
  });
}

/**
 * Mengambil daftar aset untuk pustaka tema.
 */
export async function ambilDaftarAset(jenis?: 'AUDIO' | 'GAMBAR') {
  const db = getDb();
  const hitung = await db.aset.count();
  if (hitung === 0) {
    await pastikanTemaDanAsetBawaan(db);
  }
  return db.aset.findMany({
    where: jenis ? { jenis } : undefined,
    orderBy: [{ bawaan: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Membaca buffer berkas fisik aset berdasarkan ID aset.
 */
export async function bacaFileAset(id: string): Promise<{ buffer: Buffer; mime: string; nama: string }> {
  const db = getDb();
  const aset = await db.aset.findUnique({ where: { id } });
  if (aset === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Aset tidak ditemukan.');
  }

  const storageDir = getEnv().STORAGE_DIR;
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
  const filePath = path.join(storageDir, 'aset', `${aset.sha256}.${ext}`);

  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, mime: aset.mime, nama: aset.nama };
  } catch {
    throw new AppError('FILE_TIDAK_DITEMUKAN', 404, 'Berkas fisik aset tidak ditemukan di penyimpanan.');
  }
}

/**
 * Mengambil daftar tema untuk Admin.
 */
export async function ambilDaftarTema() {
  const db = getDb();
  const hitung = await db.tema.count();
  if (hitung < 4) {
    await pastikanTemaDanAsetBawaan(db);
  }
  return db.tema.findMany({
    orderBy: [{ bawaan: 'desc' }, { createdAt: 'asc' }],
    include: {
      createdBy: { select: { nama: true } },
    },
  });
}

/**
 * Menyimpan konfigurasi tema baru atau pembaruan tema yang ada.
 */
export async function simpanTema(masukan: {
  id?: string;
  nama: string;
  config: unknown;
  aktor: PenggunaSesi;
  konteks?: KonteksRequest;
}) {
  const { id, nama, config, aktor, konteks } = masukan;
  const db = getDb();

  // 1. Validasi skema tema ketat (tanpa field asing)
  const parsedConfig = ThemeConfigSchema.parse(config);

  // 2. Validasi semua referensi aset
  await validasiAsetTema(parsedConfig, db);

  // 3. Hash kanonik
  const configJson = canonicalStringify(parsedConfig);
  const configHash = await sha256Hex(configJson);

  let hasil;
  if (id) {
    const ada = await db.tema.findUnique({ where: { id } });
    if (ada === null) {
      throw new AppError('TIDAK_DITEMUKAN', 404, 'Tema tidak ditemukan.');
    }

    hasil = await db.tema.update({
      where: { id },
      data: {
        nama,
        config: parsedConfig as unknown as object,
        configHash,
        updatedById: aktor.id,
      },
    });

    await audit(db, {
      aksi: 'TEMA_UBAH',
      aktor,
      targetTipe: 'tema',
      targetId: id,
      payload: { nama, configHash },
      konteks,
    });
  } else {
    hasil = await db.tema.create({
      data: {
        nama,
        config: parsedConfig as unknown as object,
        configHash,
        sumber: 'MANUAL',
        bawaan: false,
        createdById: aktor.id,
        updatedById: aktor.id,
      },
    });

    await audit(db, {
      aksi: 'TEMA_BUAT',
      aktor,
      targetTipe: 'tema',
      targetId: hasil.id,
      payload: { nama, configHash },
      konteks,
    });
  }

  return hasil;
}

/**
 * Mengembalikan konfigurasi tema ke default bawaan aplikasi (Tiket 24).
 */
export async function kembalikanTemaDefault(
  id: string,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
) {
  const db = getDb();
  const tema = await db.tema.findUnique({ where: { id } });
  if (tema === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Tema tidak ditemukan.');
  }

  const configJson = canonicalStringify(TEMA_DEFAULT);
  const configHash = await sha256Hex(configJson);

  const hasil = await db.tema.update({
    where: { id },
    data: {
      config: TEMA_DEFAULT as unknown as object,
      configHash,
      updatedById: aktor.id,
    },
  });

  await audit(db, {
    aksi: 'TEMA_UBAH',
    aktor,
    targetTipe: 'tema',
    targetId: id,
    payload: { aksi: 'KEMBALIKAN_DEFAULT', configHash },
    konteks,
  });

  return hasil;
}

/**
 * Admin memilih tema untuk suatu periode undian (Tiket 23).
 */
export async function pilihTemaPeriode(masukan: {
  periodeId: string;
  temaId: string;
  aktor: PenggunaSesi;
  konteks?: KonteksRequest;
}): Promise<{ sukses: boolean; temaId: string; peringatan: string | null }> {
  const { periodeId, temaId, aktor, konteks } = masukan;
  const db = getDb();

  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    select: { id: true, status: true },
  });

  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }

  if (periode.status !== 'DRAF' && periode.status !== 'TERKUNCI') {
    throw new AppError(
      'AKSI_TIDAK_VALID',
      400,
      `Tema hanya dapat diubah saat periode berstatus Draf atau Terkunci (status saat ini: ${periode.status}).`,
    );
  }

  const tema = await db.tema.findUnique({ where: { id: temaId } });
  if (tema === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Tema tidak ditemukan.');
  }

  await db.periode.update({
    where: { id: periodeId },
    data: { temaId },
  });

  const jumlahUnduhan = await db.paketUnduhan.count({ where: { periodeId } });
  const peringatan =
    jumlahUnduhan > 0
      ? 'Paket undian sudah pernah diunduh sebelumnya. Paket perlu diunduh ulang untuk menerapkan tema baru di Layar Undian.'
      : null;

  await audit(db, {
    aksi: 'TEMA_PERIODE_PILIH',
    aktor,
    targetTipe: 'periode',
    targetId: periodeId,
    payload: { temaId, namaTema: tema.nama, peringatanAda: peringatan !== null },
    konteks,
  });

  return { sukses: true, temaId, peringatan };
}
