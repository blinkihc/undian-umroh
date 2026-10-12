import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { POST as imporPost } from '@/app/api/periode/[id]/impor/route';
import { GET as eksporGet } from '@/app/api/periode/[id]/peserta/ekspor-gugur/route';
import { GET as pesertaGet } from '@/app/api/periode/[id]/peserta/route';
import { HEADER_IMPOR } from '@/lib/domain';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { buatRequest, masuk } from './helpers/aplikasi';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';
import { auditUntuk, buatPengguna, type PenggunaTes } from './helpers/pengguna';

const CSV_CAMPURAN = readFileSync(join(process.cwd(), 'tests/fixtures/impor/campuran.csv'));

type Item = {
  baris: number;
  nop: string;
  nopFormat: string;
  nikMasked: string;
  nama: string;
  kecamatan: string;
  eligible: boolean;
  alasan: string[];
  lunas: Record<string, string | null>;
  lunasRaw: Record<string, string>;
  wilayah: string | null;
};

type Halaman = { items: Item[]; page: number; pageSize: number; total: number };

let admin: PenggunaTes;
let cookieAdmin: string;
let cookieOperator: string;
let periode: { id: string; version: number };

async function cookieMasuk(pengguna: PenggunaTes): Promise<string> {
  const { cookie } = await masuk(pengguna.username, pengguna.password);
  if (cookie === null) throw new Error('Login uji gagal.');
  return cookie;
}

async function imporCsv(isi: string | Uint8Array): Promise<void> {
  const versi = (await getDb().periode.findUniqueOrThrow({ where: { id: periode.id } })).version;
  const form = new FormData();
  form.set('file', new File([typeof isi === 'string' ? isi : new Uint8Array(isi)], 'uji.csv'));
  form.set('version', String(versi));
  const respons = await imporPost(
    buatRequest(`/api/periode/${periode.id}/impor`, { multipart: form, cookie: cookieAdmin }),
    { params: Promise.resolve({ id: periode.id }) },
  );
  expect(respons.status).toBe(200);
}

async function cari(query: string, cookie = cookieAdmin): Promise<Response> {
  return pesertaGet(buatRequest(`/api/periode/${periode.id}/peserta${query}`, { cookie }), {
    params: Promise.resolve({ id: periode.id }),
  });
}

async function halaman(query: string): Promise<Halaman> {
  const respons = await cari(query);
  expect(respons.status).toBe(200);
  return (await respons.json()) as Halaman;
}

beforeAll(async () => {
  getLimiterGagal('login').resetSemua();
  admin = await buatPengguna({ peran: 'ADMIN' });
  cookieAdmin = await cookieMasuk(admin);
  cookieOperator = await cookieMasuk(await buatPengguna({ peran: 'OPERATOR' }));
  await bersihkanPeriode();
  periode = await buatPeriodeTes(admin.id);
  await imporCsv(CSV_CAMPURAN);
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

describe('GET /api/periode/:id/peserta', () => {
  it('tanpa filter: semua baris terurut, paginasi 50, data tersamar dan terformat', async () => {
    const isi = await halaman('');

    expect(isi).toMatchObject({ page: 1, pageSize: 50, total: 33 });
    expect(isi.items.map((p) => p.baris)).toEqual(Array.from({ length: 33 }, (_, i) => i + 2));
    expect(isi.items[0]).toMatchObject({
      nop: '160999000000000001',
      nopFormat: '16.09.990.000.000-0000.1',
      nikMasked: '1609xxxxxxxx0001',
      nama: 'WAJIB PAJAK SATU',
      kecamatan: 'MUARADUA',
      eligible: true,
      alasan: [],
      wilayah: null,
      lunas: { 2022: '2022-06-10T09:00:00+07:00' },
      lunasRaw: { 2022: '10/06/2022 09:00:00' },
    });
    expect(isi.items[0]).not.toHaveProperty('nikEnc');
    const tidakValid = isi.items.find((p) => p.baris === 9);
    expect(tidakValid).toMatchObject({
      nop: '170999000000000008',
      nopFormat: '170999000000000008',
    });
  });

  it('respons tidak pernah memuat NIK utuh', async () => {
    const teks = await (await cari('?pageSize=200')).text();
    expect(teks).not.toMatch(/1609990101900\d{3}/);
  });

  it.each([
    ['?status=lolos', 7],
    ['?status=gugur', 26],
    ['?wilayah=BELUM_DIPETAKAN', 33],
    ['?wilayah=W1', 0],
    ['?kecamatan=buay%20runjung', 4],
    ['?alasan=NOP_DUPLICATE', 2],
    ['?alasan=LEWAT_BATAS_2026&status=gugur', 1],
    ['?status=lolos&kecamatan=MUARADUA', 3],
  ])('filter %s → %i baris', async (query, jumlah) => {
    expect((await halaman(query)).total).toBe(jumlah);
  });

  it('pencarian NOP (awalan, boleh bertitik) dan awalan nama tanpa peka huruf', async () => {
    expect((await halaman('?q=16.09.990.000.000-0000.6')).items.map((p) => p.baris)).toEqual([7]);
    expect((await halaman('?q=1609990000000000')).total).toBe(32);
    expect((await halaman('?q=16099900000000000')).total).toBe(9);
    expect((await halaman('?q=wajib%20pajak%20dua%20puluh')).total).toBe(10);
    expect((await halaman('?q=PAJAK')).total).toBe(0);
  });

  it('paginasi: halaman 2 ukuran 10 berisi baris 12–21', async () => {
    const isi = await halaman('?page=2&pageSize=10');
    expect(isi).toMatchObject({ page: 2, pageSize: 10, total: 33 });
    expect(isi.items.map((p) => p.baris)).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    expect((await halaman('?page=9')).items).toEqual([]);
  });

  it('filter tidak valid → 400 dengan pesan per field', async () => {
    const respons = await cari('?status=semua&alasan=X');
    expect(respons.status).toBe(400);
    expect(await respons.json()).toMatchObject({
      error: {
        code: 'VALIDASI_GAGAL',
        details: {
          fields: {
            status: 'Status harus lolos atau gugur.',
            alasan: 'Kode alasan tidak dikenal.',
          },
        },
      },
    });
  });

  it('Operator ditolak 403; periode tidak ada 404', async () => {
    expect((await cari('', cookieOperator)).status).toBe(403);
    const tidakAda = await pesertaGet(
      buatRequest('/api/periode/tidak-ada/peserta', { cookie: cookieAdmin }),
      { params: Promise.resolve({ id: 'tidak-ada' }) },
    );
    expect(tidakAda.status).toBe(404);
  });
});

async function unduhEkspor(cookie = cookieAdmin): Promise<Response> {
  return eksporGet(buatRequest(`/api/periode/${periode.id}/peserta/ekspor-gugur`, { cookie }), {
    params: Promise.resolve({ id: periode.id }),
  });
}

async function bacaLembar(respons: Response): Promise<string[][]> {
  const buku = new ExcelJS.Workbook();
  await buku.xlsx.load(await respons.arrayBuffer());
  const lembar = buku.worksheets[0];
  const hasil: string[][] = [];
  lembar?.eachRow((baris) => {
    const sel: string[] = [];
    baris.eachCell({ includeEmpty: true }, (s) => {
      // Ekspor hanya menulis teks dan angka (tanpa rumus), jadi `text` sudah mewakili isi sel.
      sel.push(s.text);
    });
    hasil.push(sel);
  });
  return hasil;
}

describe('GET /api/periode/:id/peserta/ekspor-gugur', () => {
  it('berisi 26 baris gugur dengan kolom sesuai kontrak dan tercatat di audit', async () => {
    const respons = await unduhEkspor();

    expect(respons.status).toBe(200);
    expect(respons.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(respons.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="daftar-gugur-uji-[a-z0-9]+-\d{8}\.xlsx"$/,
    );
    const baris = await bacaLembar(respons);
    expect(baris[0]).toEqual([
      'Baris',
      'NOP',
      'NIK (tersamar)',
      'Nama',
      'Kecamatan',
      'Kelurahan',
      'Tanggal Lunas 2022',
      'Tanggal Lunas 2023',
      'Tanggal Lunas 2024',
      'Tanggal Lunas 2025',
      'Tanggal Lunas 2026',
      'Kode Alasan',
      'Pesan Alasan',
    ]);
    expect(baris).toHaveLength(27);
    const ganda = baris.find((b) => b[0] === '10');
    expect(ganda).toEqual([
      '10',
      '16.09.990.000.000-0000.9',
      '1609xxxxxxxx0009',
      'WAJIB PAJAK SEMBILAN',
      'KISAM TINGGI',
      'BUMI AGUNG',
      '10/06/2022 09:00:00',
      '12/07/2023 10:00:00',
      '05/08/2024 11:00:00',
      '20/08/2025 12:00:00',
      '11/08/2026 13:00:00',
      'NOP_DUPLICATE',
      'NOP muncul lebih dari satu kali dalam file.',
    ]);
    expect(JSON.stringify(baris)).not.toMatch(/1609990101900\d{3}/);
    const jejak = await auditUntuk({ targetId: periode.id, aksi: 'EKSPOR_UNDUH' });
    expect(jejak.at(-1)?.payload).toEqual({ jenis: 'DAFTAR_GUGUR', jumlahBaris: 26 });
  });

  it('sel diawali =, +, -, @ dinetralkan dengan awalan kutip', async () => {
    const tanggal = '10/06/2022;12/07/2023;05/08/2024;20/08/2025;';
    await imporCsv(
      [
        HEADER_IMPOR.join(';'),
        `160999000000000201;1609990101900201;=HYPERLINK("http://contoh.invalid");+ALAMAT;-OP;@KEC;-KEL;${tanggal}`,
      ].join('\n'),
    );

    const baris = await bacaLembar(await unduhEkspor());

    expect(baris[1]?.slice(3, 6)).toEqual([
      '\'=HYPERLINK("http://contoh.invalid")',
      "'@KEC",
      "'-KEL",
    ]);
    expect(baris[1]?.[11]).toBe('TANGGAL_KOSONG_2026');
  });

  it('Operator ditolak 403', async () => {
    expect((await unduhEkspor(cookieOperator)).status).toBe(403);
  });
});
