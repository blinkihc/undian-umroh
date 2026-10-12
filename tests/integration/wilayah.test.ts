import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST as imporPost } from '@/app/api/periode/[id]/impor/route';
import { GET as pesertaGet } from '@/app/api/periode/[id]/peserta/route';
import { GET as ringkasanGet } from '@/app/api/periode/[id]/ringkasan/route';
import { GET, PUT } from '@/app/api/periode/[id]/wilayah/route';
import { HEADER_IMPOR } from '@/lib/domain';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { buatRequest, masuk } from './helpers/aplikasi';
import { aturStatusPeriode, bersihkanPeriode, buatPeriodeTes } from './helpers/periode';
import { auditUntuk, buatPengguna, type PenggunaTes } from './helpers/pengguna';

const CSV_CAMPURAN = readFileSync(join(process.cwd(), 'tests/fixtures/impor/campuran.csv'));

type Pemetaan = {
  kecamatan: { kecamatan: string; wilayah: string | null; jumlahLolos: number; mirip: string[] }[];
  ringkasan: Record<string, { jumlahKecamatan: number; jumlahLolos: number }>;
  version: number;
};

let admin: PenggunaTes;
let cookie: string;
let cookieOperator: string;
let periode: { id: string; version: number };

const params = (): { params: Promise<{ id: string }> } => ({
  params: Promise.resolve({ id: periode.id }),
});

async function versi(): Promise<number> {
  return (await getDb().periode.findUniqueOrThrow({ where: { id: periode.id } })).version;
}

async function impor(isi: string | Uint8Array): Promise<void> {
  const form = new FormData();
  form.set('file', new File([typeof isi === 'string' ? isi : new Uint8Array(isi)], 'data.csv'));
  form.set('version', String(await versi()));
  const respons = await imporPost(
    buatRequest(`/api/periode/${periode.id}/impor`, { multipart: form, cookie }),
    params(),
  );
  expect(respons.status).toBe(200);
}

async function ambil(c = cookie): Promise<Response> {
  return GET(buatRequest(`/api/periode/${periode.id}/wilayah`, { cookie: c }), params());
}

async function simpan(isi: unknown, c = cookie): Promise<Response> {
  return PUT(
    buatRequest(`/api/periode/${periode.id}/wilayah`, { method: 'PUT', json: isi, cookie: c }),
    params(),
  );
}

beforeAll(async () => {
  getLimiterGagal('login').resetSemua();
  admin = await buatPengguna({ peran: 'ADMIN' });
  cookie = (await masuk(admin.username, admin.password)).cookie ?? '';
  const operator = await buatPengguna({ peran: 'OPERATOR' });
  cookieOperator = (await masuk(operator.username, operator.password)).cookie ?? '';
});

beforeEach(async () => {
  await bersihkanPeriode();
  periode = await buatPeriodeTes(admin.id);
  await impor(CSV_CAMPURAN);
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

describe('GET /api/periode/:id/wilayah', () => {
  it('daftar kecamatan dari impor dengan jumlah lolos, semua belum dipetakan', async () => {
    const isi = (await (await ambil()).json()) as Pemetaan;

    expect(isi.kecamatan).toEqual([
      { kecamatan: 'BUAY RUNJUNG', wilayah: null, jumlahLolos: 4, mirip: [] },
      { kecamatan: 'KISAM TINGGI', wilayah: null, jumlahLolos: 0, mirip: [] },
      { kecamatan: 'MUARADUA', wilayah: null, jumlahLolos: 3, mirip: [] },
    ]);
    expect(isi.ringkasan.BELUM_DIPETAKAN).toEqual({ jumlahKecamatan: 3, jumlahLolos: 7 });
    expect(isi.version).toBe(2);
  });
});

describe('PUT /api/periode/:id/wilayah', () => {
  it('menyimpan pemetaan, version naik, ringkasan & filter peserta ikut berubah, audit tercatat', async () => {
    const respons = await simpan({
      version: 2,
      pemetaan: [
        { kecamatan: 'MUARADUA', wilayah: 'W1' },
        { kecamatan: 'BUAY RUNJUNG', wilayah: 'W2' },
      ],
    });

    expect(respons.status).toBe(200);
    const isi = (await respons.json()) as Pemetaan;
    expect(isi.version).toBe(3);
    expect(isi.kecamatan[0]).toMatchObject({ kecamatan: 'KISAM TINGGI', wilayah: null });
    expect(isi.ringkasan).toEqual({
      W1: { jumlahKecamatan: 1, jumlahLolos: 3 },
      W2: { jumlahKecamatan: 1, jumlahLolos: 4 },
      BELUM_DIPETAKAN: { jumlahKecamatan: 1, jumlahLolos: 0 },
    });

    const ringkasan = await ringkasanGet(
      buatRequest(`/api/periode/${periode.id}/ringkasan`, { cookie }),
      params(),
    );
    expect(await ringkasan.json()).toMatchObject({
      lolosPerWilayah: { W1: 3, W2: 4, BELUM_DIPETAKAN: 0 },
      kecamatanBelumDipetakan: ['KISAM TINGGI'],
    });
    const w1 = await pesertaGet(
      buatRequest(`/api/periode/${periode.id}/peserta?wilayah=W1`, { cookie }),
      params(),
    );
    const isiW1 = (await w1.json()) as { total: number; items: { wilayah: string }[] };
    expect(isiW1.total).toBe(3);
    expect(isiW1.items.every((p) => p.wilayah === 'W1')).toBe(true);
    const belum = await pesertaGet(
      buatRequest(`/api/periode/${periode.id}/peserta?wilayah=BELUM_DIPETAKAN`, { cookie }),
      params(),
    );
    // 33 baris − MUARADUA (3) − BUAY RUNJUNG (4): KISAM TINGGI dan baris kecamatan kosong.
    expect(((await belum.json()) as { total: number }).total).toBe(26);

    const jejak = await auditUntuk({ targetId: periode.id, aksi: 'WILAYAH_PETAKAN' });
    expect(jejak[0]?.payload).toMatchObject({ jumlahDiubah: 2 });
  });

  it('satu kecamatan satu wilayah: memindah ke W2 mengganti W1, null melepas', async () => {
    await simpan({ version: 2, pemetaan: [{ kecamatan: 'MUARADUA', wilayah: 'W1' }] });
    await simpan({ version: 3, pemetaan: [{ kecamatan: 'MUARADUA', wilayah: 'W2' }] });

    const baris = await getDb().kecamatanWilayah.findMany({
      where: { periodeId: periode.id, kecamatan: 'MUARADUA' },
      select: { wilayah: { select: { kode: true } } },
    });
    expect(baris).toEqual([{ wilayah: { kode: 'W2' } }]);

    await simpan({ version: 4, pemetaan: [{ kecamatan: 'MUARADUA', wilayah: null }] });
    const isi = (await (await ambil()).json()) as Pemetaan;
    expect(isi.kecamatan.find((k) => k.kecamatan === 'MUARADUA')?.wilayah).toBeNull();
  });

  it('pemetaan dipertahankan saat impor ulang; kecamatan baru muncul belum dipetakan', async () => {
    await simpan({ version: 2, pemetaan: [{ kecamatan: 'MUARADUA', wilayah: 'W1' }] });
    const tanggal = '10/06/2022;12/07/2023;05/08/2024;20/08/2025;11/08/2026';
    await impor(
      [
        HEADER_IMPOR.join(';'),
        `160999000000000601;1609990101900601;A;;;MUARADUA;;${tanggal}`,
        `160999000000000602;1609990101900602;B;;;MUARA DUA;;${tanggal}`,
      ].join('\n'),
    );

    const isi = (await (await ambil()).json()) as Pemetaan;
    expect(isi.kecamatan).toEqual([
      { kecamatan: 'MUARA DUA', wilayah: null, jumlahLolos: 1, mirip: ['MUARADUA'] },
      { kecamatan: 'MUARADUA', wilayah: 'W1', jumlahLolos: 1, mirip: ['MUARA DUA'] },
    ]);
  });

  it('tanpa perubahan tidak menaikkan version', async () => {
    const respons = await simpan({
      version: 2,
      pemetaan: [{ kecamatan: 'MUARADUA', wilayah: null }],
    });
    expect(((await respons.json()) as Pemetaan).version).toBe(2);
  });

  it('kecamatan yang tidak ada di data ditolak 400', async () => {
    const respons = await simpan({
      version: 2,
      pemetaan: [{ kecamatan: 'TIDAK ADA', wilayah: 'W1' }],
    });
    expect(respons.status).toBe(400);
    expect(await respons.json()).toMatchObject({
      error: { details: { kecamatanTidakDikenal: ['TIDAK ADA'] } },
    });
  });

  it('version basi 409 CONFLICT; periode terkunci 409 PERIODE_TERKUNCI', async () => {
    expect(
      (await simpan({ version: 1, pemetaan: [{ kecamatan: 'MUARADUA', wilayah: 'W1' }] })).status,
    ).toBe(409);
    await aturStatusPeriode(periode.id, 'TERKUNCI');
    const respons = await simpan({
      version: 2,
      pemetaan: [{ kecamatan: 'MUARADUA', wilayah: 'W1' }],
    });
    expect(await respons.json()).toMatchObject({ error: { code: 'PERIODE_TERKUNCI' } });
  });

  it('Operator ditolak 403 untuk baca dan simpan', async () => {
    expect((await ambil(cookieOperator)).status).toBe(403);
    expect(
      (
        await simpan(
          { version: 2, pemetaan: [{ kecamatan: 'MUARADUA', wilayah: 'W1' }] },
          cookieOperator,
        )
      ).status,
    ).toBe(403);
  });
});
