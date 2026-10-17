import { promises as fs } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST as batalPost } from '@/app/api/periode/[id]/batal/route';
import { POST as imporPost } from '@/app/api/periode/[id]/impor/route';
import { POST as bukaKunciPost } from '@/app/api/periode/[id]/kunci/buka/route';
import { GET as kunciGet, POST as kunciPost } from '@/app/api/periode/[id]/kunci/route';
import { PATCH } from '@/app/api/periode/[id]/route';
import { PUT as wilayahPut } from '@/app/api/periode/[id]/wilayah/route';
import { getEnv } from '@/config/env';
import { getDb, tutupDb } from '@/server/db';

import { buatRequest, masuk } from './helpers/aplikasi';
import { buatPengguna, type PenggunaTes } from './helpers/pengguna';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';

let admin: PenggunaTes;
let cookieAdmin: string;
let _cookieOperator: string;

async function cookieMasuk(pengguna: PenggunaTes): Promise<string> {
  const { cookie } = await masuk(pengguna.username, pengguna.password);
  if (cookie === null) throw new Error('Login uji gagal.');
  return cookie;
}

beforeAll(async () => {
  admin = await buatPengguna({ peran: 'ADMIN' });
  const operator = await buatPengguna({ peran: 'OPERATOR' });
  cookieAdmin = await cookieMasuk(admin);
  _cookieOperator = await cookieMasuk(operator);
});

beforeEach(async () => {
  await bersihkanPeriode();
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('Kunci Snapshot Peserta (Tiket 10)', () => {
  it('menolak penguncian bila prasyarat belum lengkap', async () => {
    const periode = await buatPeriodeTes();

    // 1. Belum ada data impor
    const resTanpaImpor = await kunciPost(
      buatRequest(`/api/periode/${periode.id}/kunci`, {
        json: { version: periode.version, konfirmasiJudul: periode.judul },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resTanpaImpor.status).toBe(422);
    const jsonTanpaImpor = (await resTanpaImpor.json()) as { error: { code: string } };
    expect(jsonTanpaImpor.error.code).toBe('PRASYARAT_KUNCI_BELUM_LENGKAP');

    // 2. Buat impor tapi belum dipetakan
    const impor = await getDb().impor.create({
      data: {
        periodeId: periode.id,
        namaFile: 'uji.csv',
        fileSha256: 'a'.repeat(64),
        totalBaris: 6,
        jumlahLolos: 6,
        jumlahGugur: 0,
        ringkasan: {
          gugurPerAlasan: {},
          nikTidakValid: 0,
          nopGanda: 0,
          lolosPerKecamatan: { MUARADUA: 6 },
        },
        importedById: admin.id,
      },
    });

    await getDb().kecamatanWilayah.create({
      data: { periodeId: periode.id, kecamatan: 'MUARADUA', wilayahId: null },
    });

    for (let i = 1; i <= 6; i++) {
      await getDb().peserta.create({
        data: {
          periodeId: periode.id,
          imporId: impor.id,
          baris: i + 1,
          nop: `16091234567890123${i.toString()}`,
          nikMasked: `1609xxxxxxxx000${i.toString()}`,
          nikValid: true,
          nama: `Peserta ${i.toString()}`,
          alamatWp: 'Alamat WP',
          alamatOp: 'Alamat OP',
          kecamatanRaw: 'MUARADUA',
          kecamatan: 'MUARADUA',
          kelurahan: 'Kelurahan',
          lunas2022: new Date('2022-06-01T00:00:00Z'),
          lunas2023: new Date('2023-06-01T00:00:00Z'),
          lunas2024: new Date('2024-06-01T00:00:00Z'),
          lunas2025: new Date('2025-06-01T00:00:00Z'),
          lunas2026: new Date('2026-06-01T00:00:00Z'),
          lunasRaw: {},
          eligible: true,
          alasan: [],
        },
      });
    }

    // Cek endpoint prasyarat GET
    const resGetPrasyarat = await kunciGet(
      buatRequest(`/api/periode/${periode.id}/kunci`, { cookie: cookieAdmin }),
      params(periode.id),
    );
    expect(resGetPrasyarat.status).toBe(200);
    const dataPrasyarat = (await resGetPrasyarat.json()) as {
      siapKunci: boolean;
      kecamatanBelumDipetakan: number;
    };
    expect(dataPrasyarat.siapKunci).toBe(false);
    expect(dataPrasyarat.kecamatanBelumDipetakan).toBe(1);

    // Kunci ditolak karena kecamatan belum dipetakan
    const resBelumPeta = await kunciPost(
      buatRequest(`/api/periode/${periode.id}/kunci`, {
        json: { version: periode.version, konfirmasiJudul: periode.judul },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resBelumPeta.status).toBe(422);
  });

  it('mengunci periode sukses bila semua prasyarat terpenuhi, menulis file kanonik dan hash byte-identik', async () => {
    const periode = await buatPeriodeTes();
    const w1 = await getDb().wilayah.findFirstOrThrow({
      where: { periodeId: periode.id, kode: 'W1' },
    });
    const w2 = await getDb().wilayah.findFirstOrThrow({
      where: { periodeId: periode.id, kode: 'W2' },
    });

    const impor = await getDb().impor.create({
      data: {
        periodeId: periode.id,
        namaFile: 'data-lengkap.csv',
        fileSha256: 'b'.repeat(64),
        totalBaris: 6,
        jumlahLolos: 6,
        jumlahGugur: 0,
        ringkasan: {
          gugurPerAlasan: {},
          nikTidakValid: 0,
          nopGanda: 0,
          lolosPerKecamatan: { MUARADUA: 3, BANDING: 3 },
        },
        importedById: admin.id,
      },
    });

    await getDb().kecamatanWilayah.createMany({
      data: [
        { periodeId: periode.id, kecamatan: 'MUARADUA', wilayahId: w1.id },
        { periodeId: periode.id, kecamatan: 'BANDING', wilayahId: w2.id },
      ],
    });

    // 3 peserta W1 (MUARADUA) dan 3 peserta W2 (BANDING)
    for (let i = 1; i <= 3; i++) {
      await getDb().peserta.create({
        data: {
          periodeId: periode.id,
          imporId: impor.id,
          baris: i + 1,
          nop: `16091000000000000${i.toString()}`,
          nikMasked: `1609xxxxxxxx000${i.toString()}`,
          nikValid: true,
          nama: `Peserta W1 ${i.toString()}`,
          alamatWp: 'Alamat WP',
          alamatOp: 'Alamat OP',
          kecamatanRaw: 'MUARADUA',
          kecamatan: 'MUARADUA',
          kelurahan: 'Kelurahan A',
          lunas2022: new Date('2022-06-01T00:00:00Z'),
          lunas2023: new Date('2023-06-01T00:00:00Z'),
          lunas2024: new Date('2024-06-01T00:00:00Z'),
          lunas2025: new Date('2025-06-01T00:00:00Z'),
          lunas2026: new Date('2026-06-01T00:00:00Z'),
          lunasRaw: {},
          eligible: true,
          alasan: [],
        },
      });
    }

    for (let i = 1; i <= 3; i++) {
      await getDb().peserta.create({
        data: {
          periodeId: periode.id,
          imporId: impor.id,
          baris: i + 4,
          nop: `16092000000000000${i.toString()}`,
          nikMasked: `1609xxxxxxxx001${i.toString()}`,
          nikValid: true,
          nama: `Peserta W2 ${i.toString()}`,
          alamatWp: 'Alamat WP',
          alamatOp: 'Alamat OP',
          kecamatanRaw: 'BANDING',
          kecamatan: 'BANDING',
          kelurahan: 'Kelurahan B',
          lunas2022: new Date('2022-06-01T00:00:00Z'),
          lunas2023: new Date('2023-06-01T00:00:00Z'),
          lunas2024: new Date('2024-06-01T00:00:00Z'),
          lunas2025: new Date('2025-06-01T00:00:00Z'),
          lunas2026: new Date('2026-06-01T00:00:00Z'),
          lunasRaw: {},
          eligible: true,
          alasan: [],
        },
      });
    }

    // Salah konfirmasi judul ditolak 400
    const resJudulSalah = await kunciPost(
      buatRequest(`/api/periode/${periode.id}/kunci`, {
        json: { version: periode.version, konfirmasiJudul: 'Judul Salah' },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resJudulSalah.status).toBe(400);

    // Kunci berhasil
    const resSukses = await kunciPost(
      buatRequest(`/api/periode/${periode.id}/kunci`, {
        json: { version: periode.version, konfirmasiJudul: periode.judul },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resSukses.status).toBe(200);
    const hasil = (await resSukses.json()) as {
      status: string;
      snapshotHash: string;
      jumlah: { W1: number; W2: number };
      lockedAt: string;
      version: number;
    };

    expect(hasil.status).toBe('TERKUNCI');
    expect(hasil.jumlah).toEqual({ W1: 3, W2: 3 });
    expect(hasil.snapshotHash).toHaveLength(64);
    expect(hasil.version).toBe(periode.version + 1);

    // Verifikasi file snapshot kanonik tertulis di STORAGE_DIR
    const storageDir = getEnv().STORAGE_DIR;
    const fileSnapshot = path.join(storageDir, 'snapshot', `${periode.id}.json`);
    const isiFile = await fs.readFile(fileSnapshot, 'utf-8');
    expect(isiFile).toContain('"versiFormat":1');
    expect(isiFile).toContain(periode.id);

    // Cek trigger immutable pada tabel snapshot dan snapshot_peserta
    const snapshotDb = await getDb().snapshot.findUniqueOrThrow({
      where: { periodeId: periode.id },
    });
    await expect(
      getDb().$executeRaw`UPDATE snapshot SET hash = 'diubah' WHERE id = ${snapshotDb.id}`,
    ).rejects.toThrow(/immutable/);
    await expect(
      getDb().$executeRaw`DELETE FROM snapshot WHERE id = ${snapshotDb.id}`,
    ).rejects.toThrow(/immutable/);
    await expect(
      getDb().$executeRaw`UPDATE snapshot_peserta SET nop = 'diubah' WHERE snapshot_id = ${snapshotDb.id}`,
    ).rejects.toThrow(/immutable/);
    await expect(
      getDb().$executeRaw`DELETE FROM snapshot_peserta WHERE snapshot_id = ${snapshotDb.id}`,
    ).rejects.toThrow(/immutable/);

    // Setelah terkunci: impor ditolak PERIODE_TERKUNCI
    const formImpor = new FormData();
    formImpor.set('file', new File(['a'], 'uji.csv'));
    formImpor.set('version', String(hasil.version));
    const resImpor = await imporPost(
      buatRequest(`/api/periode/${periode.id}/impor`, { multipart: formImpor, cookie: cookieAdmin }),
      params(periode.id),
    );
    expect(resImpor.status).toBe(409);
    expect(((await resImpor.json()) as { error: { code: string } }).error.code).toBe(
      'PERIODE_TERKUNCI',
    );

    // Setelah terkunci: ubah batas ditolak PERIODE_TERKUNCI
    const resBatas = await PATCH(
      buatRequest(`/api/periode/${periode.id}`, {
        json: { version: hasil.version, batasLunas: '2026-08-31T23:59:59+07:00' },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resBatas.status).toBe(409);
    expect(((await resBatas.json()) as { error: { code: string } }).error.code).toBe(
      'PERIODE_TERKUNCI',
    );

    // Setelah terkunci: ubah pemetaan ditolak PERIODE_TERKUNCI
    const resPeta = await wilayahPut(
      buatRequest(`/api/periode/${periode.id}/wilayah`, {
        json: { version: hasil.version, pemetaan: [{ kecamatan: 'MUARADUA', wilayah: 'W2' }] },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resPeta.status).toBe(409);
    expect(((await resPeta.json()) as { error: { code: string } }).error.code).toBe(
      'PERIODE_TERKUNCI',
    );

    // Kunci ulang ditolak 409
    const resKunciUlang = await kunciPost(
      buatRequest(`/api/periode/${periode.id}/kunci`, {
        json: { version: hasil.version, konfirmasiJudul: periode.judul },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resKunciUlang.status).toBe(409);

    // Periode Terkunci tanpa hasil dapat dibatalkan dengan alasan (DECISIONS 016)
    const resBatal = await batalPost(
      buatRequest(`/api/periode/${periode.id}/batal`, {
        json: {
          version: hasil.version,
          alasan: 'Pembatalan periode terkunci karena acara ditunda oleh panitia',
        },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resBatal.status).toBe(200);
    const batalData = (await resBatal.json()) as { status: string };
    expect(batalData.status).toBe('DIBATALKAN');
  });

  it('admin dapat membuka kunci periode yang terkunci kembali ke DRAF', async () => {
    const periode = await buatPeriodeTes();
    const impor = await getDb().impor.create({
      data: {
        periodeId: periode.id,
        namaFile: 'uji.csv',
        fileSha256: 'a'.repeat(64),
        totalBaris: 6,
        jumlahLolos: 6,
        jumlahGugur: 0,
        ringkasan: {
          gugurPerAlasan: {},
          nikTidakValid: 0,
          nopGanda: 0,
          lolosPerKecamatan: { MUARADUA: 3, BANDANG: 3 },
        },
        importedById: admin.id,
      },
    });

    const w1 = await getDb().wilayah.findFirstOrThrow({
      where: { periodeId: periode.id, kode: 'W1' },
    });
    const w2 = await getDb().wilayah.findFirstOrThrow({
      where: { periodeId: periode.id, kode: 'W2' },
    });

    await getDb().kecamatanWilayah.createMany({
      data: [
        { periodeId: periode.id, kecamatan: 'MUARADUA', wilayahId: w1.id },
        { periodeId: periode.id, kecamatan: 'BANDANG', wilayahId: w2.id },
      ],
    });

    for (let i = 1; i <= 6; i++) {
      const kec = i <= 3 ? 'MUARADUA' : 'BANDANG';
      await getDb().peserta.create({
        data: {
          periodeId: periode.id,
          imporId: impor.id,
          baris: i + 1,
          nop: `16091234567890123${i.toString()}`,
          nikMasked: `1609xxxxxxxx000${i.toString()}`,
          nikValid: true,
          nama: `Peserta ${i.toString()}`,
          alamatWp: 'Alamat WP',
          alamatOp: 'Alamat OP',
          kecamatanRaw: kec,
          kecamatan: kec,
          kelurahan: 'KEL',
          eligible: true,
          alasan: [],
          lunasRaw: {},
        },
      });
    }

    const resKunci = await kunciPost(
      buatRequest(`/api/periode/${periode.id}/kunci`, {
        json: { version: periode.version, konfirmasiJudul: periode.judul },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resKunci.status).toBe(200);
    const hasil = (await resKunci.json()) as { version: number };

    const resBuka = await bukaKunciPost(
      buatRequest(`/api/periode/${periode.id}/kunci/buka`, {
        json: {
          version: hasil.version,
          alasan: 'Alasan buka kunci untuk perbaikan data peserta',
        },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resBuka.status).toBe(200);
    const dataBuka = (await resBuka.json()) as { ok: boolean; status: string; version: number };
    expect(dataBuka.ok).toBe(true);
    expect(dataBuka.status).toBe('DRAF');
    expect(dataBuka.version).toBe(hasil.version + 1);

    const periodeDb = await getDb().periode.findUniqueOrThrow({ where: { id: periode.id } });
    expect(periodeDb.status).toBe('DRAF');

    const snapshotDb = await getDb().snapshot.findUnique({ where: { periodeId: periode.id } });
    expect(snapshotDb).toBeNull();

    const auditDb = await getDb().auditLog.findFirst({
      where: { targetId: periode.id, aksi: 'PERIODE_BUKA_KUNCI' },
    });
    expect(auditDb).not.toBeNull();
  });
});
