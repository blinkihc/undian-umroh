import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST as batalPost } from '@/app/api/periode/[id]/batal/route';
import { GET as detailGet, PATCH } from '@/app/api/periode/[id]/route';
import { GET as daftarGet, POST } from '@/app/api/periode/route';
import { BATAS_LUNAS_BAWAAN, JUDUL_PERIODE_BAWAAN } from '@/lib/domain';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { buatRequest, masuk } from './helpers/aplikasi';
import { aturStatusPeriode, bersihkanPeriode } from './helpers/periode';
import { auditUntuk, buatPengguna, type PenggunaTes } from './helpers/pengguna';

type IsiGalat = {
  error: { code: string; message: string; details?: Record<string, unknown> };
};

type Periode = {
  id: string;
  slug: string;
  judul: string;
  status: string;
  batasLunas: string;
  tanggalAcara: string | null;
  lokasiAcara: string | null;
  wilayah: { kode: string; nama: string; jumlahLolos: number }[];
  alasanBatal: string | null;
  version: number;
};

const ISI_LENGKAP = {
  judul: JUDUL_PERIODE_BAWAAN,
  batasLunas: BATAS_LUNAS_BAWAAN,
  tanggalAcara: '2026-10-20',
  lokasiAcara: 'Gedung Kesenian Muaradua',
  namaWilayah: { W1: 'Wilayah Barat', W2: 'Wilayah Timur' },
};

const ALASAN = 'Data ekspor salah kecamatan, akan diimpor ulang di periode baru';

let admin: PenggunaTes;
let cookieAdmin: string;
let cookieOperator: string;

async function cookieMasuk(pengguna: PenggunaTes): Promise<string> {
  const { cookie } = await masuk(pengguna.username, pengguna.password);
  if (cookie === null) throw new Error('Login uji gagal.');
  return cookie;
}

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function buatLewatApi(isi: unknown, cookie = cookieAdmin): Promise<Response> {
  return POST(buatRequest('/api/periode', { json: isi, cookie }));
}

async function buatPeriodeUji(isi: unknown = ISI_LENGKAP): Promise<Periode> {
  const respons = await buatLewatApi(isi);
  expect(respons.status).toBe(201);
  return (await respons.json()) as Periode;
}

async function ubahLewatApi(id: string, isi: unknown, cookie = cookieAdmin): Promise<Response> {
  return PATCH(
    buatRequest(`/api/periode/${id}`, { method: 'PATCH', json: isi, cookie }),
    params(id),
  );
}

async function batalLewatApi(id: string, isi: unknown, cookie = cookieAdmin): Promise<Response> {
  return batalPost(buatRequest(`/api/periode/${id}/batal`, { json: isi, cookie }), params(id));
}

async function galat(respons: Response): Promise<IsiGalat['error'] & { status: number }> {
  const isi = (await respons.json()) as IsiGalat;
  return { status: respons.status, ...isi.error };
}

beforeAll(async () => {
  getLimiterGagal('login').resetSemua();
  admin = await buatPengguna({ peran: 'ADMIN' });
  cookieAdmin = await cookieMasuk(admin);
  cookieOperator = await cookieMasuk(await buatPengguna({ peran: 'OPERATOR' }));
});

beforeEach(async () => {
  await bersihkanPeriode();
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

describe('POST /api/periode', () => {
  it('membuat periode Draf dengan dua wilayah dan mencatat audit', async () => {
    const respons = await buatLewatApi(ISI_LENGKAP);

    expect(respons.status).toBe(201);
    const periode = (await respons.json()) as Periode;
    expect(periode).toMatchObject({
      slug: 'undian-umroh-2026',
      judul: JUDUL_PERIODE_BAWAAN,
      status: 'DRAF',
      batasLunas: BATAS_LUNAS_BAWAAN,
      tahunAwal: 2022,
      tahunAkhir: 2026,
      tanggalAcara: '2026-10-20',
      lokasiAcara: 'Gedung Kesenian Muaradua',
      wilayah: [
        { kode: 'W1', nama: 'Wilayah Barat', jumlahLolos: 0 },
        { kode: 'W2', nama: 'Wilayah Timur', jumlahLolos: 0 },
      ],
      snapshot: null,
      hasil: null,
      alasanBatal: null,
      version: 1,
    });
    const baris = await getDb().periode.findUniqueOrThrow({ where: { id: periode.id } });
    expect(baris.createdById).toBe(admin.id);
    expect(baris.batasLunas.toISOString()).toBe('2026-09-30T16:59:59.000Z');

    const jejak = await auditUntuk({ targetId: periode.id });
    expect(jejak).toHaveLength(1);
    expect(jejak[0]).toMatchObject({
      aksi: 'PERIODE_BUAT',
      aktorId: admin.id,
      payload: {
        judul: JUDUL_PERIODE_BAWAAN,
        slug: 'undian-umroh-2026',
        batasLunas: BATAS_LUNAS_BAWAAN,
        batasLunasBawaan: true,
        namaWilayah: { W1: 'Wilayah Barat', W2: 'Wilayah Timur' },
      },
    });
  });

  it('memakai nama wilayah bawaan dan acara kosong bila tidak diisi', async () => {
    const periode = await buatPeriodeUji({
      judul: 'Undian Uji Bawaan',
      batasLunas: '2026-10-31T23:59:59+07:00',
    });

    expect(periode).toMatchObject({
      batasLunas: '2026-10-31T23:59:59+07:00',
      tanggalAcara: null,
      lokasiAcara: null,
      wilayah: [
        { kode: 'W1', nama: 'Wilayah 1' },
        { kode: 'W2', nama: 'Wilayah 2' },
      ],
    });
  });

  it('menolak isian tidak valid dengan pesan per field tanpa membuat periode', async () => {
    const respons = await buatLewatApi({
      judul: 'abc',
      batasLunas: '2025-06-30T23:59:59+07:00',
      tanggalAcara: '2026-02-30',
      namaWilayah: { W1: '' },
    });

    expect(await galat(respons)).toMatchObject({
      status: 400,
      code: 'VALIDASI_GAGAL',
      details: {
        fields: {
          judul: 'Judul minimal 5 karakter.',
          batasLunas: 'Tanggal batas tidak boleh sebelum 1 Januari 2026.',
          tanggalAcara: 'Tanggal acara tidak dikenali.',
          'namaWilayah.W1': 'Nama wilayah wajib diisi.',
        },
      },
    });
    expect(await getDb().periode.count()).toBe(0);
  });

  it('menolak periode aktif kedua dengan PERIODE_AKTIF_SUDAH_ADA', async () => {
    const pertama = await buatPeriodeUji();

    const respons = await buatLewatApi({ ...ISI_LENGKAP, judul: 'Periode Kedua' });

    expect(await galat(respons)).toMatchObject({
      status: 409,
      code: 'PERIODE_AKTIF_SUDAH_ADA',
      message: `Masih ada periode aktif: ${JUDUL_PERIODE_BAWAAN}. Publikasikan atau batalkan periode tersebut dulu.`,
      details: { periodeId: pertama.id, status: 'DRAF' },
    });
    expect(await getDb().periode.count()).toBe(1);
  });

  it('dua permintaan bersamaan: tepat satu berhasil', async () => {
    const hasil = await Promise.all([
      buatLewatApi({ ...ISI_LENGKAP, judul: 'Bersamaan Satu' }),
      buatLewatApi({ ...ISI_LENGKAP, judul: 'Bersamaan Dua' }),
    ]);

    expect(hasil.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await getDb().periode.count()).toBe(1);
  });

  it.each(['TERKUNCI', 'DIUNDI', 'FINAL'] as const)(
    'periode %s masih dihitung aktif',
    async (status) => {
      const lama = await buatPeriodeUji();
      await aturStatusPeriode(lama.id, status);

      const respons = await buatLewatApi(ISI_LENGKAP);

      expect((await galat(respons)).code).toBe('PERIODE_AKTIF_SUDAH_ADA');
    },
  );

  it('periode baru boleh dibuat setelah periode lama Dipublikasi atau Dibatalkan', async () => {
    const dipublikasi = await buatPeriodeUji();
    await aturStatusPeriode(dipublikasi.id, 'DIPUBLIKASI');
    const kedua = await buatPeriodeUji();
    expect((await batalLewatApi(kedua.id, { version: 1, alasan: ALASAN })).status).toBe(200);

    const ketiga = await buatPeriodeUji();

    expect([dipublikasi.slug, kedua.slug, ketiga.slug]).toEqual([
      'undian-umroh-2026',
      'undian-umroh-2026-2',
      'undian-umroh-2026-3',
    ]);
  });

  it('index database periode_satu_aktif menolak periode aktif kedua walau melewati service', async () => {
    await buatPeriodeUji();

    await expect(
      getDb().periode.create({
        data: {
          slug: 'jalan-pintas',
          judul: 'Lewat jalan pintas',
          batasLunas: new Date(BATAS_LUNAS_BAWAAN),
          createdById: admin.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('constraint database mewajibkan alasan saat status Dibatalkan', async () => {
    const periode = await buatPeriodeUji();

    await expect(
      getDb().periode.update({ where: { id: periode.id }, data: { status: 'DIBATALKAN' } }),
    ).rejects.toThrow(/periode_alasan_batal_check/);
  });
});

describe('PATCH /api/periode/:id', () => {
  it('mengubah judul, acara, batas, dan nama wilayah; version naik dan audit tercatat', async () => {
    const lama = await buatPeriodeUji();

    const respons = await ubahLewatApi(lama.id, {
      version: 1,
      judul: 'Undian Umroh Uji Ubah',
      batasLunas: '2026-10-15T23:59:59+07:00',
      tanggalAcara: null,
      lokasiAcara: 'Aula Bapenda',
      namaWilayah: { W1: 'Wilayah Utara' },
    });

    expect(respons.status).toBe(200);
    expect(await respons.json()).toMatchObject({
      judul: 'Undian Umroh Uji Ubah',
      batasLunas: '2026-10-15T23:59:59+07:00',
      tanggalAcara: null,
      lokasiAcara: 'Aula Bapenda',
      wilayah: [
        { kode: 'W1', nama: 'Wilayah Utara' },
        { kode: 'W2', nama: 'Wilayah Timur' },
      ],
      slug: 'undian-umroh-2026',
      version: 2,
    });
    const jejak = await auditUntuk({ targetId: lama.id });
    expect(jejak.map((j) => j.aksi)).toEqual(['PERIODE_BUAT', 'PERIODE_UBAH', 'WILAYAH_NAMA_UBAH']);
    expect(jejak[1]?.payload).toEqual({
      perubahan: {
        judul: { lama: JUDUL_PERIODE_BAWAAN, baru: 'Undian Umroh Uji Ubah' },
        batasLunas: { lama: BATAS_LUNAS_BAWAAN, baru: '2026-10-15T23:59:59+07:00' },
        tanggalAcara: { lama: '2026-10-20', baru: null },
        lokasiAcara: { lama: 'Gedung Kesenian Muaradua', baru: 'Aula Bapenda' },
      },
    });
    expect(jejak[2]?.payload).toEqual({
      perubahan: { W1: { lama: 'Wilayah Barat', baru: 'Wilayah Utara' } },
    });
  });

  it('perubahan tanpa efek tidak menaikkan version dan tidak menulis audit', async () => {
    const lama = await buatPeriodeUji();

    const respons = await ubahLewatApi(lama.id, {
      version: 1,
      judul: JUDUL_PERIODE_BAWAAN,
      namaWilayah: { W2: 'Wilayah Timur' },
    });

    expect(((await respons.json()) as Periode).version).toBe(1);
    expect(await auditUntuk({ targetId: lama.id })).toHaveLength(1);
  });

  it('versi basi menghasilkan 409 CONFLICT dan data tidak berubah', async () => {
    const lama = await buatPeriodeUji();
    await ubahLewatApi(lama.id, { version: 1, judul: 'Diubah Admin Lain' });

    const respons = await ubahLewatApi(lama.id, { version: 1, judul: 'Perubahan Basi' });

    expect(await galat(respons)).toMatchObject({
      status: 409,
      code: 'CONFLICT',
      details: { version: 2 },
    });
    const baris = await getDb().periode.findUniqueOrThrow({ where: { id: lama.id } });
    expect(baris.judul).toBe('Diubah Admin Lain');
  });

  it('tanggal batas ditolak setelah Terkunci, tetapi judul masih boleh diubah', async () => {
    const lama = await buatPeriodeUji();
    await aturStatusPeriode(lama.id, 'TERKUNCI');

    const batas = await ubahLewatApi(lama.id, {
      version: 1,
      batasLunas: '2026-10-15T23:59:59+07:00',
    });
    const judul = await ubahLewatApi(lama.id, { version: 1, judul: 'Judul Setelah Kunci' });

    expect(await galat(batas)).toMatchObject({
      status: 409,
      code: 'PERIODE_TERKUNCI',
      details: { status: 'TERKUNCI', alasan: 'BATAS_HANYA_DRAF' },
    });
    expect(judul.status).toBe(200);
  });

  it.each([
    ['DIPUBLIKASI', 'Periode sudah dipublikasikan. Data tidak dapat diubah.'],
    ['DIBATALKAN', 'Periode sudah dibatalkan. Data tidak dapat diubah.'],
  ] as const)('periode %s tidak dapat diubah', async (status, pesan) => {
    const lama = await buatPeriodeUji();
    if (status === 'DIBATALKAN') {
      await batalLewatApi(lama.id, { version: 1, alasan: ALASAN });
    } else {
      await aturStatusPeriode(lama.id, status);
    }
    const version = (await getDb().periode.findUniqueOrThrow({ where: { id: lama.id } })).version;

    const respons = await ubahLewatApi(lama.id, { version, judul: 'Tidak Boleh Berubah' });

    expect(await galat(respons)).toMatchObject({
      status: 409,
      code: 'PERIODE_TERKUNCI',
      message: pesan,
    });
  });

  it('menolak isian kosong tanpa perubahan dan periode yang tidak ada', async () => {
    const lama = await buatPeriodeUji();

    expect((await galat(await ubahLewatApi(lama.id, { version: 1 }))).code).toBe('VALIDASI_GAGAL');
    expect(
      await galat(await ubahLewatApi('tidak-ada', { version: 1, judul: 'Apa Saja' })),
    ).toMatchObject({
      status: 404,
      code: 'TIDAK_DITEMUKAN',
    });
  });

  it('mengubah batasLunas mengevaluasi ulang peserta dan ringkasan', async () => {
    const periode = await buatPeriodeUji();
    const impor = await getDb().impor.create({
      data: {
        periodeId: periode.id,
        namaFile: 'uji.csv',
        fileSha256: 'a'.repeat(64),
        totalBaris: 1,
        jumlahLolos: 1,
        jumlahGugur: 0,
        ringkasan: {
          gugurPerAlasan: {},
          nikTidakValid: 0,
          nopGanda: 0,
          lolosPerKecamatan: { MUARADUA: 1 },
        },
        importedById: admin.id,
      },
    });
    const peserta = await getDb().peserta.create({
      data: {
        periodeId: periode.id,
        imporId: impor.id,
        baris: 2,
        nop: '160912345678901234',
        nikMasked: '1609xxxxxxxx0001',
        nikValid: true,
        nama: 'Peserta Uji',
        alamatWp: 'Jl. Uji',
        alamatOp: 'Jl. OP',
        kecamatanRaw: 'MUARADUA',
        kecamatan: 'MUARADUA',
        kelurahan: 'Pasar',
        lunas2022: new Date('2022-06-01T00:00:00Z'),
        lunas2023: new Date('2023-06-01T00:00:00Z'),
        lunas2024: new Date('2024-06-01T00:00:00Z'),
        lunas2025: new Date('2025-06-01T00:00:00Z'),
        lunas2026: new Date('2026-09-15T00:00:00Z'),
        lunasRaw: {},
        eligible: true,
        alasan: [],
      },
    });

    const resTurun = await ubahLewatApi(periode.id, {
      version: 1,
      batasLunas: '2026-08-31T23:59:59+07:00',
    });
    expect(resTurun.status).toBe(200);

    const pesertaGugur = await getDb().peserta.findUniqueOrThrow({ where: { id: peserta.id } });
    expect(pesertaGugur.eligible).toBe(false);
    expect(pesertaGugur.alasan).toContain('LEWAT_BATAS_2026');

    const imporGugur = await getDb().impor.findUniqueOrThrow({ where: { id: impor.id } });
    expect(imporGugur.jumlahLolos).toBe(0);
    expect(imporGugur.jumlahGugur).toBe(1);

    const resNaik = await ubahLewatApi(periode.id, {
      version: 2,
      batasLunas: '2026-09-30T23:59:59+07:00',
    });
    expect(resNaik.status).toBe(200);

    const pesertaLolos = await getDb().peserta.findUniqueOrThrow({ where: { id: peserta.id } });
    expect(pesertaLolos.eligible).toBe(true);
    expect(pesertaLolos.alasan).toEqual([]);

    const imporLolos = await getDb().impor.findUniqueOrThrow({ where: { id: impor.id } });
    expect(imporLolos.jumlahLolos).toBe(1);
    expect(imporLolos.jumlahGugur).toBe(0);
  });
});

describe('POST /api/periode/:id/batal', () => {
  it('membatalkan periode Draf dengan alasan dan mencatat audit', async () => {
    const lama = await buatPeriodeUji();

    const respons = await batalLewatApi(lama.id, { version: 1, alasan: `  ${ALASAN} ` });

    expect(respons.status).toBe(200);
    expect(await respons.json()).toMatchObject({
      status: 'DIBATALKAN',
      alasanBatal: ALASAN,
      version: 2,
    });
    const jejak = await auditUntuk({ targetId: lama.id, aksi: 'PERIODE_BATAL' });
    expect(jejak).toHaveLength(1);
    expect(jejak[0]?.payload).toEqual({
      judul: JUDUL_PERIODE_BAWAAN,
      statusSebelumnya: 'DRAF',
      alasan: ALASAN,
    });
  });

  it('periode Terkunci boleh dibatalkan', async () => {
    const lama = await buatPeriodeUji();
    await aturStatusPeriode(lama.id, 'TERKUNCI');

    const respons = await batalLewatApi(lama.id, { version: 1, alasan: ALASAN });

    expect(((await respons.json()) as Periode).status).toBe('DIBATALKAN');
  });

  it('alasan wajib; tanpa alasan periode tetap Draf', async () => {
    const lama = await buatPeriodeUji();

    const respons = await batalLewatApi(lama.id, { version: 1, alasan: 'pendek' });

    expect(await galat(respons)).toMatchObject({
      status: 400,
      code: 'VALIDASI_GAGAL',
      details: { fields: { alasan: 'Alasan pembatalan minimal 10 karakter.' } },
    });
    expect((await getDb().periode.findUniqueOrThrow({ where: { id: lama.id } })).status).toBe(
      'DRAF',
    );
  });

  it('Dibatalkan bersifat final: pembatalan kedua ditolak', async () => {
    const lama = await buatPeriodeUji();
    await batalLewatApi(lama.id, { version: 1, alasan: ALASAN });

    const respons = await batalLewatApi(lama.id, { version: 2, alasan: ALASAN });

    expect(await galat(respons)).toMatchObject({
      status: 409,
      code: 'PERIODE_TERKUNCI',
      details: { status: 'DIBATALKAN', alasan: 'PERIODE_SUDAH_DIBATALKAN' },
    });
  });

  it('periode yang sudah diundi tidak dapat dibatalkan', async () => {
    const lama = await buatPeriodeUji();
    await aturStatusPeriode(lama.id, 'DIUNDI');

    const respons = await batalLewatApi(lama.id, { version: 1, alasan: ALASAN });

    expect(await galat(respons)).toMatchObject({
      status: 409,
      code: 'PERIODE_TERKUNCI',
      message: 'Periode yang sudah memiliki hasil undian tidak dapat dibatalkan.',
    });
  });

  it('versi basi menghasilkan 409 CONFLICT', async () => {
    const lama = await buatPeriodeUji();
    await ubahLewatApi(lama.id, { version: 1, judul: 'Diubah Dulu' });

    const respons = await batalLewatApi(lama.id, { version: 1, alasan: ALASAN });

    expect(await galat(respons)).toMatchObject({ status: 409, code: 'CONFLICT' });
  });
});

describe('hak akses periode', () => {
  it('Operator dapat melihat daftar dan detail periode', async () => {
    const periode = await buatPeriodeUji();

    const daftar = await daftarGet(buatRequest('/api/periode', { cookie: cookieOperator }));
    const detail = await detailGet(
      buatRequest(`/api/periode/${periode.id}`, { cookie: cookieOperator }),
      params(periode.id),
    );

    expect(daftar.status).toBe(200);
    expect(await daftar.json()).toEqual({
      items: [
        {
          id: periode.id,
          slug: 'undian-umroh-2026',
          judul: JUDUL_PERIODE_BAWAAN,
          status: 'DRAF',
          batasLunas: BATAS_LUNAS_BAWAAN,
          tanggalAcara: '2026-10-20',
          lokasiAcara: 'Gedung Kesenian Muaradua',
          version: 1,
        },
      ],
    });
    expect(detail.status).toBe(200);
    expect(((await detail.json()) as Periode).wilayah).toHaveLength(2);
  });

  it('Operator tidak dapat membuat, mengubah, atau membatalkan periode', async () => {
    const periode = await buatPeriodeUji();

    const hasil = await Promise.all([
      buatLewatApi(ISI_LENGKAP, cookieOperator),
      ubahLewatApi(periode.id, { version: 1, judul: 'Diubah Operator' }, cookieOperator),
      batalLewatApi(periode.id, { version: 1, alasan: ALASAN }, cookieOperator),
    ]);

    for (const respons of hasil) {
      expect(await galat(respons)).toMatchObject({ status: 403, code: 'AKSES_DITOLAK' });
    }
    const baris = await getDb().periode.findUniqueOrThrow({ where: { id: periode.id } });
    expect(baris).toMatchObject({ judul: JUDUL_PERIODE_BAWAAN, status: 'DRAF', version: 1 });
  });

  it('tanpa sesi ditolak 401; detail periode yang tidak ada 404', async () => {
    const tanpaSesi = await daftarGet(buatRequest('/api/periode'));
    const tidakAda = await detailGet(
      buatRequest('/api/periode/tidak-ada', { cookie: cookieAdmin }),
      params('tidak-ada'),
    );

    expect((await galat(tanpaSesi)).status).toBe(401);
    expect(await galat(tidakAda)).toMatchObject({ status: 404, code: 'TIDAK_DITEMUKAN' });
  });

  it('daftar terurut dari periode terbaru', async () => {
    const lama = await buatPeriodeUji();
    await batalLewatApi(lama.id, { version: 1, alasan: ALASAN });
    const baru = await buatPeriodeUji();

    const respons = await daftarGet(buatRequest('/api/periode', { cookie: cookieAdmin }));

    const { items } = (await respons.json()) as { items: Periode[] };
    expect(items.map((p) => [p.id, p.status])).toEqual([
      [baru.id, 'DRAF'],
      [lama.id, 'DIBATALKAN'],
    ]);
  });
});
