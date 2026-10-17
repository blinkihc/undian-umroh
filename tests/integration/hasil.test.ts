import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST as batalHasilPost } from '@/app/api/periode/[id]/hasil/batal/route';
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

    const [pW1_0, pW1_1, pW1_2] = pesertaW1;
    const [pW2_0, pW2_1, pW2_2] = pesertaW2;
    if (!pW1_0 || !pW1_1 || !pW1_2 || !pW2_0 || !pW2_1 || !pW2_2) {
      throw new Error('Peserta snapshot tidak lengkap untuk pengujian.');
    }

    function toPesertaUndian(
      sp: (typeof snapshot.peserta)[number],
      nama: string,
      kec: string,
    ) {
      return {
        urut: sp.urut,
        wilayah: sp.wilayah,
        nopMasked: sp.nop,
        nikMasked: '1609xxxxxxxx0001',
        nama,
        alamatWp: 'Alamat WP',
        alamatOp: 'Alamat OP',
        kecamatan: kec,
        kelurahan: 'Kelurahan',
        lunas: [
          '2022-06-01T00:00:00Z',
          '2023-06-01T00:00:00Z',
          '2024-06-01T00:00:00Z',
          '2025-06-01T00:00:00Z',
          '2026-06-01T00:00:00Z',
        ],
      };
    }

    const lockedMs = new Date(snapshot.lockedAt).getTime();
    const tMulai = new Date(lockedMs + 5_000).toISOString();
    const tSlot1 = new Date(lockedMs + 10_000).toISOString();
    const tSlot2 = new Date(lockedMs + 15_000).toISOString();
    const tSelesai = new Date(lockedMs + 20_000).toISOString();

    const state: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 1,
      slotSelesai: [
        {
          urutan: 1,
          kode: 'W1-UTAMA',
          urut: pW1_0.urut,
          pemenang: toPesertaUndian(pW1_0, 'Pemenang 1', 'MUARADUA'),
          diundiAt: tSlot1,
        },
        {
          urutan: 2,
          kode: 'W2-UTAMA',
          urut: pW2_0.urut,
          pemenang: toPesertaUndian(pW2_0, 'Pemenang 2', 'BANDING'),
          diundiAt: tSlot2,
        },
      ],
      dimulaiAt: tMulai,
      selesaiAt: tSelesai,
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
    expect(body.slot).toHaveLength(2);
    expect(body.slot[0]?.kode).toBe('W1-UTAMA');
    expect(body.slot[1]?.kode).toBe('W2-UTAMA');

    // Cek di DB
    const periodeDb = await getDb().periode.findUniqueOrThrow({
      where: { id: periode.id },
      include: { hasilUndian: true, slotHasil: { orderBy: { urutan: 'asc' } } },
    });

    expect(periodeDb.status).toBe('DIUNDI');
    expect(periodeDb.hasilUndian).not.toBeNull();
    expect(periodeDb.hasilUndian?.hasilHash).toBe(fileHasil.hasilHash);
    expect(periodeDb.hasilUndian?.uploadedById).toBe(operator.id);

    // Cek 2 slot pemenang utama
    expect(periodeDb.slotHasil).toHaveLength(2);
    const slot1 = periodeDb.slotHasil[0];
    const slot2 = periodeDb.slotHasil[1];
    expect(slot1).toBeDefined();
    expect(slot2).toBeDefined();
    if (!slot1 || !slot2) {
      throw new Error('Slot hasil tidak lengkap di database.');
    }
    expect(slot1.slot).toBe('W1_UTAMA');
    expect(slot1.status).toBe('MENANG');
    expect(slot1.penerimaAktif).toBe(true);

    expect(slot2.slot).toBe('W2_UTAMA');
    expect(slot2.status).toBe('MENANG');
    expect(slot2.penerimaAktif).toBe(true);

    // Cek log audit
    const hasilUndianId = periodeDb.hasilUndian?.id ?? '';
    const auditLog = await getDb().auditLog.findFirst({
      where: { targetId: hasilUndianId, aksi: 'HASIL_UNGGAH' },
    });
    expect(auditLog).not.toBeNull();

    // Cek Immutabilitas: Trigger tolak_ubah_tabel_immutable pada tabel hasil_undian
    await expect(
      getDb().$executeRawUnsafe(
        `UPDATE "hasil_undian" SET "hasil_hash" = 'manipulasi' WHERE "id" = '${hasilUndianId}'`,
      ),
    ).rejects.toThrow();

    await expect(
      getDb().$executeRawUnsafe(
        `DELETE FROM "hasil_undian" WHERE "id" = '${hasilUndianId}'`,
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

    // ---------------------------------------------------------
    // Pengujian Pembatalan Hasil Undian (POST /api/periode/:id/hasil/batal)
    // ---------------------------------------------------------
    // Operator ditolak membatalkan hasil
    const resBatalOperator = await batalHasilPost(
      buatRequest(`/api/periode/${periode.id}/hasil/batal`, {
        json: { version: body.version, alasan: 'Mencoba batal oleh operator' },
        cookie: cookieOperator,
      }),
      params(periode.id),
    );
    expect(resBatalOperator.status).toBe(403);

    // Konflik version ditolak
    const resBatalKonflik = await batalHasilPost(
      buatRequest(`/api/periode/${periode.id}/hasil/batal`, {
        json: { version: body.version + 99, alasan: 'Versi tidak cocok' },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resBatalKonflik.status).toBe(409);

    // Admin berhasil membatalkan hasil undian
    const resBatal = await batalHasilPost(
      buatRequest(`/api/periode/${periode.id}/hasil/batal`, {
        json: { version: body.version, alasan: 'Pembatalan resmi untuk undi ulang' },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resBatal.status).toBe(200);
    const dataBatal = (await resBatal.json()) as { ok: boolean; status: string; version: number };
    expect(dataBatal.ok).toBe(true);
    expect(dataBatal.status).toBe('TERKUNCI');
    expect(dataBatal.version).toBe(body.version + 1);

    // Verifikasi di basis data: tabel hasil_undian dan slot_hasil harus kosong kembali
    const sisaHasil = await getDb().hasilUndian.findUnique({
      where: { periodeId: periode.id },
    });
    expect(sisaHasil).toBeNull();

    const totalSlot = await getDb().slotHasil.count({
      where: { periodeId: periode.id },
    });
    expect(totalSlot).toBe(0);

    // Verifikasi status periode kembali ke TERKUNCI
    const periodeKembali = await getDb().periode.findUniqueOrThrow({
      where: { id: periode.id },
    });
    expect(periodeKembali.status).toBe('TERKUNCI');

    // Cek log audit HASIL_BATAL
    const auditBatal = await getDb().auditLog.findFirst({
      where: { targetId: periode.id, aksi: 'HASIL_BATAL' },
    });
    expect(auditBatal).not.toBeNull();
    expect((auditBatal?.payload as { alasan?: string })?.alasan).toBe('Pembatalan resmi untuk undi ulang');

    // Periode yang sudah kembali TERKUNCI kini dapat menerima unggahan hasil kembali
    const resUnggahUlang = await hasilPost(
      buatRequest(`/api/periode/${periode.id}/hasil`, {
        json: fileHasil,
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resUnggahUlang.status).toBe(200);
  });
});
