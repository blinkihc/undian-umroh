import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { POST as hasilPost } from '@/app/api/periode/[id]/hasil/route';
import { POST as kunciPost } from '@/app/api/periode/[id]/kunci/route';
import { bangunFileHasil } from '@/lib/draw/hasil';
import { type StateUndian } from '@/lib/draw/types';
import { getDb, tutupDb } from '@/server/db';

import { buatRequest, masuk } from './helpers/aplikasi';
import { buatPengguna, type PenggunaTes } from './helpers/pengguna';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';

let admin: PenggunaTes;
let operator: PenggunaTes;
let cookieAdmin: string;
let cookieOperator: string;

async function cookieMasuk(pengguna: PenggunaTes): Promise<string> {
  const { cookie } = await masuk(pengguna.username, pengguna.password);
  if (cookie === null) throw new Error('Login uji gagal.');
  return cookie;
}

beforeAll(async () => {
  admin = await buatPengguna({ peran: 'ADMIN' });
  operator = await buatPengguna({ peran: 'OPERATOR' });
  cookieAdmin = await cookieMasuk(admin);
  cookieOperator = await cookieMasuk(operator);
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function siapkanPeriodeTerkunci() {
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
      namaFile: 'data.csv',
      fileSha256: 'h'.repeat(64),
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

  for (let i = 1; i <= 3; i++) {
    await getDb().peserta.create({
      data: {
        periodeId: periode.id,
        imporId: impor.id,
        baris: i + 1,
        nop: `16090100000000000${i.toString()}`,
        nikMasked: `1609xxxxxxxx000${i.toString()}`,
        nikValid: true,
        nama: `Peserta W1 ${i.toString()}`,
        alamatWp: 'Alamat WP W1',
        alamatOp: 'Alamat OP W1',
        kecamatanRaw: 'MUARADUA',
        kecamatan: 'MUARADUA',
        kelurahan: 'Kelurahan W1',
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

  for (let i = 4; i <= 6; i++) {
    await getDb().peserta.create({
      data: {
        periodeId: periode.id,
        imporId: impor.id,
        baris: i + 1,
        nop: `16090200000000000${i.toString()}`,
        nikMasked: `1609xxxxxxxx000${i.toString()}`,
        nikValid: true,
        nama: `Peserta W2 ${i.toString()}`,
        alamatWp: 'Alamat WP W2',
        alamatOp: 'Alamat OP W2',
        kecamatanRaw: 'BANDING',
        kecamatan: 'BANDING',
        kelurahan: 'Kelurahan W2',
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

  // Kunci periode
  const kunciRes = await kunciPost(
    buatRequest(`/api/periode/${periode.id}/kunci`, {
      json: { version: periode.version, konfirmasiJudul: periode.judul },
      cookie: cookieAdmin,
    }),
    params(periode.id),
  );
  expect(kunciRes.status).toBe(200);
  const dataKunci = (await kunciRes.json()) as { snapshotHash: string };

  const snapshot = await getDb().snapshot.findUniqueOrThrow({
    where: { periodeId: periode.id },
    include: { peserta: { orderBy: { urut: 'asc' } } },
  });

  return {
    periode: await getDb().periode.findUniqueOrThrow({ where: { id: periode.id } }),
    snapshot,
    snapshotHash: dataKunci.snapshotHash,
  };
}

describe('Unggah dan Verifikasi Hasil Undian (Tiket 17)', () => {
  it('menolak unggahan pada periode yang berstatus DRAF', async () => {
    const periode = await buatPeriodeTes();

    const respons = await hasilPost(
      buatRequest(`/api/periode/${periode.id}/hasil`, {
        json: { dummy: 'data' },
        cookie: cookieOperator,
      }),
      params(periode.id),
    );

    expect(respons.status).toBe(409);
    const json = (await respons.json()) as { error: { code: string } };
    expect(json.error.code).toBe('PERIODE_BUKAN_TERKUNCI');
  });

  it('berhasil mengunggah hasil valid oleh operator, menyimpan 6 slot, mengubah status ke DIUNDI, dan mencatat audit', async () => {
    const { periode, snapshot, snapshotHash } = await siapkanPeriodeTerkunci();

    const pesertaW1 = snapshot.peserta.filter((p) => p.wilayah === 'W1');
    const pesertaW2 = snapshot.peserta.filter((p) => p.wilayah === 'W2');

    const state: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai: [
        {
          urutan: 1,
          kode: 'W1-UTAMA',
          urut: pesertaW1[0].urut,
          peserta: { nop: pesertaW1[0].nop, nama: 'Pemenang 1', kecamatan: 'MUARADUA' },
          diundiAt: '2026-10-12T10:05:00.000Z',
        },
        {
          urutan: 2,
          kode: 'W1-C1',
          urut: pesertaW1[1].urut,
          peserta: { nop: pesertaW1[1].nop, nama: 'Cadangan 1 W1', kecamatan: 'MUARADUA' },
          diundiAt: '2026-10-12T10:10:00.000Z',
        },
        {
          urutan: 3,
          kode: 'W1-C2',
          urut: pesertaW1[2].urut,
          peserta: { nop: pesertaW1[2].nop, nama: 'Cadangan 2 W1', kecamatan: 'MUARADUA' },
          diundiAt: '2026-10-12T10:15:00.000Z',
        },
        {
          urutan: 4,
          kode: 'W2-UTAMA',
          urut: pesertaW2[0].urut,
          peserta: { nop: pesertaW2[0].nop, nama: 'Pemenang 2', kecamatan: 'BANDING' },
          diundiAt: '2026-10-12T10:20:00.000Z',
        },
        {
          urutan: 5,
          kode: 'W2-C1',
          urut: pesertaW2[1].urut,
          peserta: { nop: pesertaW2[1].nop, nama: 'Cadangan 1 W2', kecamatan: 'BANDING' },
          diundiAt: '2026-10-12T10:25:00.000Z',
        },
        {
          urutan: 6,
          kode: 'W2-C2',
          urut: pesertaW2[2].urut,
          peserta: { nop: pesertaW2[2].nop, nama: 'Cadangan 2 W2', kecamatan: 'BANDING' },
          diundiAt: '2026-10-12T10:30:00.000Z',
        },
      ],
      pemenangTampil: null,
      animasiMulaiAt: null,
      dimulaiAt: '2026-10-12T10:00:00.000Z',
      selesaiAt: '2026-10-12T10:35:00.000Z',
      catatanLokal: [],
    };

    const fileHasil = await bangunFileHasil({
      periodeId: periode.id,
      snapshotHash,
      temaConfigHash: 'a'.repeat(64),
      perangkat: { id: 'laptop_acara_01', userAgent: 'HeadlessChrome' },
      state,
    });

    const res = await hasilPost(
      buatRequest(`/api/periode/${periode.id}/hasil`, {
        json: fileHasil,
        cookie: cookieOperator,
      }),
      params(periode.id),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      hasilHash: string;
      slot: { kode: string; nopMasked: string; nama: string; kecamatan: string }[];
      version: number;
    };

    expect(body.status).toBe('DIUNDI');
    expect(body.hasilHash).toBe(fileHasil.hasilHash);
    expect(body.slot).toHaveLength(6);
    expect(body.slot[0].kode).toBe('W1-UTAMA');

    // Cek di DB
    const periodeDb = await getDb().periode.findUniqueOrThrow({
      where: { id: periode.id },
      include: { hasilUndian: true, slotHasil: { orderBy: { urutan: 'asc' } } },
    });

    expect(periodeDb.status).toBe('DIUNDI');
    expect(periodeDb.hasilUndian).not.toBeNull();
    expect(periodeDb.hasilUndian?.hasilHash).toBe(fileHasil.hasilHash);
    expect(periodeDb.hasilUndian?.uploadedById).toBe(operator.id);

    // Cek 6 slot
    expect(periodeDb.slotHasil).toHaveLength(6);
    const slot1 = periodeDb.slotHasil[0];
    expect(slot1.slot).toBe('W1_UTAMA');
    expect(slot1.status).toBe('MENANG');
    expect(slot1.penerimaAktif).toBe(true);

    const slot2 = periodeDb.slotHasil[1];
    expect(slot2.slot).toBe('W1_C1');
    expect(slot2.status).toBe('CADANGAN');
    expect(slot2.penerimaAktif).toBe(false);

    // Cek log audit
    const auditLog = await getDb().auditLog.findFirst({
      where: { targetId: periodeDb.hasilUndian?.id, aksi: 'HASIL_UNGGAH' },
    });
    expect(auditLog).not.toBeNull();

    // Cek Immutabilitas: Trigger tolak_ubah_tabel_immutable pada tabel hasil_undian
    await expect(
      getDb().$executeRawUnsafe(
        `UPDATE "hasil_undian" SET "hasil_hash" = 'manipulasi' WHERE "id" = '${periodeDb.hasilUndian?.id}'`,
      ),
    ).rejects.toThrow();

    await expect(
      getDb().$executeRawUnsafe(
        `DELETE FROM "hasil_undian" WHERE "id" = '${periodeDb.hasilUndian?.id}'`,
      ),
    ).rejects.toThrow();

    // Tes unggahan kedua ditolak HASIL_SUDAH_DIUNGGAH
    const resKedua = await hasilPost(
      buatRequest(`/api/periode/${periode.id}/hasil`, {
        json: fileHasil,
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );

    expect(resKedua.status).toBe(409);
    const errKedua = (await resKedua.json()) as { error: { code: string; message: string } };
    expect(errKedua.error.code).toBe('HASIL_SUDAH_DIUNGGAH');
    expect(errKedua.error.message).toContain('Unggahan ditolak');

    // Cek log audit HASIL_DITOLAK
    const auditDitolak = await getDb().auditLog.findFirst({
      where: { targetId: periode.id, aksi: 'HASIL_DITOLAK' },
    });
    expect(auditDitolak).not.toBeNull();
  });
});
