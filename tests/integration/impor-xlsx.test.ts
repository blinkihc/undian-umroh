import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { strToU8, zipSync } from 'fflate';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/periode/[id]/impor/route';
import { HEADER_IMPOR } from '@/lib/domain';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { csvSintetis } from '../../scripts/lib/data-sintetis';
import { buatXlsxCampuran } from '../support/xlsx-uji';
import { buatRequest, masuk } from './helpers/aplikasi';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';
import { buatPengguna, type PenggunaTes } from './helpers/pengguna';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type IsiGalat = { error: { code: string; message: string } };

let admin: PenggunaTes;
let cookie: string;
let periode: { id: string; version: number };

async function versi(): Promise<number> {
  return (await getDb().periode.findUniqueOrThrow({ where: { id: periode.id } })).version;
}

async function impor(isi: string | Uint8Array, nama: string, mime: string): Promise<Response> {
  const form = new FormData();
  const bagian = typeof isi === 'string' ? isi : new Uint8Array(isi);
  form.set('file', new File([bagian], nama, { type: mime }));
  form.set('version', String(await versi()));
  return POST(buatRequest(`/api/periode/${periode.id}/impor`, { multipart: form, cookie }), {
    params: Promise.resolve({ id: periode.id }),
  });
}

async function galat(
  respons: Response,
): Promise<{ status: number; code: string; message: string }> {
  return { status: respons.status, ...((await respons.json()) as IsiGalat).error };
}

async function pesertaBaris(baris: number): Promise<Record<string, unknown>> {
  return getDb().peserta.findFirstOrThrow({ where: { periodeId: periode.id, baris } });
}

beforeAll(async () => {
  getLimiterGagal('login').resetSemua();
  admin = await buatPengguna({ peran: 'ADMIN' });
  const hasil = await masuk(admin.username, admin.password);
  cookie = hasil.cookie ?? '';
});

beforeEach(async () => {
  await bersihkanPeriode();
  periode = await buatPeriodeTes(admin.id);
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

describe('impor XLSX', () => {
  it('membaca sheet pertama sebagai teks: NIK angka utuh, tanggal Date/serial, rumus = hasil tersimpan', async () => {
    const respons = await impor(await buatXlsxCampuran(), 'ekspor.xlsx', MIME_XLSX);

    expect(respons.status).toBe(200);
    expect(await respons.json()).toMatchObject({ totalBaris: 7, jumlahLolos: 3 });
    expect(await pesertaBaris(2)).toMatchObject({ eligible: true, alasan: [] });
    const dua = await pesertaBaris(3);
    expect(dua).toMatchObject({ nikMasked: '1609xxxxxxxx0302', nikValid: true, eligible: true });
    expect(dua.lunasRaw).toMatchObject({
      2022: '29/06/2022 14:14:36',
      2026: '30/09/2026 23:59:59',
    });
    const tiga = await pesertaBaris(4);
    expect(tiga.lunasRaw).toMatchObject({
      2022: '29/06/2022 14:14:12',
      2026: '01/10/2026 00:00:00',
    });
    expect(tiga.alasan).toEqual(['LEWAT_BATAS_2026']);
    const empat = await pesertaBaris(5);
    expect(empat).toMatchObject({ alasan: ['NOP_INVALID'] });
    expect(String(empat.nop)).toMatch(/E\+17$/);
    expect(await pesertaBaris(6)).toMatchObject({ nama: 'WAJIB PAJAK XLSX LIMA', eligible: true });
    expect(await pesertaBaris(7)).toMatchObject({ kelurahan: '', alasan: ['TANGGAL_KOSONG_2024'] });
    expect(await pesertaBaris(8)).toMatchObject({ alasan: ['FORMAT_BARIS'] });
  });

  it('zip tanpa workbook atau rusak ditolak FILE_TIDAK_VALID', async () => {
    const bukanWorkbook = zipSync({ 'isi.txt': strToU8('halo') });
    const rusak = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5]);

    for (const isi of [bukanWorkbook, rusak]) {
      expect(await galat(await impor(isi, 'data.xlsx', MIME_XLSX))).toMatchObject({
        status: 400,
        code: 'FILE_TIDAK_VALID',
        message:
          'File XLSX rusak atau bukan workbook Excel. Simpan ulang dari Excel lalu coba lagi.',
      });
    }
  });

  it('isi terurai lebih dari 200 MB ditolak sebelum dibaca (zip bomb)', async () => {
    const bom = zipSync(
      {
        '[Content_Types].xml': strToU8('<Types/>'),
        'xl/workbook.xml': strToU8('<workbook/>'),
        'xl/worksheets/sheet1.xml': new Uint8Array(201 * 1024 * 1024),
      },
      { level: 9 },
    );
    expect(bom.length).toBeLessThan(20 * 1024 * 1024);

    expect(await galat(await impor(bom, 'bom.xlsx', MIME_XLSX))).toMatchObject({
      code: 'FILE_TIDAK_VALID',
      message: 'Isi file XLSX terlalu besar (lebih dari 200 MB setelah diurai).',
    });
    expect(await getDb().impor.count()).toBe(0);
  });

  it('ekstensi, MIME, dan isi harus konsisten', async () => {
    const csv = [HEADER_IMPOR.join(';'), ''].join('\n');
    const xlsx = await buatXlsxCampuran();

    const kasus: [string | Uint8Array, string, string][] = [
      [xlsx, 'data.csv', 'text/csv'],
      [csv, 'data.xlsx', MIME_XLSX],
      [xlsx, 'data.xlsx', 'image/png'],
      [csv, 'data.csv', 'application/pdf'],
    ];
    for (const [isi, nama, mime] of kasus) {
      expect(await galat(await impor(isi, nama, mime))).toMatchObject({
        code: 'FILE_TIDAK_VALID',
        message:
          'Isi file tidak sesuai ekstensinya. Simpan ulang sebagai .csv (pemisah titik koma) atau .xlsx.',
      });
    }
  });

  it('CSV dari Excel Windows (MIME vnd.ms-excel) diterima', async () => {
    const respons = await impor(csvSintetis({ rows: 5 }), 'data.csv', 'application/vnd.ms-excel');
    expect(respons.status).toBe(200);
  });
});

describe('encoding CSV', () => {
  it('CSV Windows-1252 dibaca dengan karakter beraksen utuh', async () => {
    const teks = [
      HEADER_IMPOR.join(';'),
      '160999000000000401;1609990101900401;WAJIB PAJAK ÉLIA;JL. CAFÉ;DUSUN Ä;MUARADUA;PASAR;10/06/2022;12/07/2023;05/08/2024;20/08/2025;11/08/2026',
    ].join('\r\n');
    const respons = await impor(Buffer.from(teks, 'latin1'), 'lama.csv', 'text/csv');

    expect(respons.status).toBe(200);
    expect(await pesertaBaris(2)).toMatchObject({ nama: 'WAJIB PAJAK ÉLIA', alamatWp: 'JL. CAFÉ' });
  });

  it('byte tidak terdefinisi Windows-1252, NUL, atau UTF-16 ditolak dengan pesan simpan ulang', async () => {
    const dasar = Buffer.from(`${HEADER_IMPOR.join(';')}\n`, 'latin1');
    const kasus = [
      Buffer.concat([dasar, Buffer.from([0x81, 0x41])]),
      Buffer.concat([dasar, Buffer.from([0x00])]),
      Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(HEADER_IMPOR.join(';'), 'utf16le')]),
    ];
    for (const isi of kasus) {
      expect(await galat(await impor(isi, 'rusak.csv', 'text/csv'))).toMatchObject({
        code: 'FILE_TIDAK_VALID',
        message: 'File tidak dapat dibaca. Simpan ulang sebagai CSV UTF-8.',
      });
    }
  });

  it('fixture header salah ditolak HEADER_TIDAK_SESUAI', async () => {
    const isi = readFileSync(join(process.cwd(), 'tests/fixtures/impor/header-salah.csv'));
    expect((await galat(await impor(isi, 'salah.csv', 'text/csv'))).code).toBe(
      'HEADER_TIDAK_SESUAI',
    );
  });

  it('lebih dari 100.000 baris data ditolak', async () => {
    const baris = '160999000000000501;;N;;;K;;;;;;';
    const isi = [HEADER_IMPOR.join(';'), ...Array<string>(100_001).fill(baris)].join('\n');

    expect(await galat(await impor(isi, 'besar.csv', 'text/csv'))).toMatchObject({
      code: 'FILE_TIDAK_VALID',
      message: 'File berisi lebih dari 100.000 baris data.',
    });
  });
});
