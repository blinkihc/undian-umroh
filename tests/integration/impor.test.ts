import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/periode/[id]/impor/route';
import { GET as ringkasanGet } from '@/app/api/periode/[id]/ringkasan/route';
import { HEADER_IMPOR } from '@/lib/domain';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';
import { dekripsiNik } from '@/server/nik';

import { buatRequest, masuk } from './helpers/aplikasi';
import { aturStatusPeriode, bersihkanPeriode, buatPeriodeTes } from './helpers/periode';
import { auditUntuk, buatPengguna, type PenggunaTes } from './helpers/pengguna';

const CSV_CAMPURAN = readFileSync(join(process.cwd(), 'tests/fixtures/impor/campuran.csv'));

type IsiGalat = { error: { code: string; message: string; details?: Record<string, unknown> } };

type Ringkasan = {
  imporId: string;
  totalBaris: number;
  jumlahLolos: number;
  jumlahGugur: number;
  gugurPerAlasan: Record<string, number>;
  version: number;
};

let admin: PenggunaTes;
let cookieAdmin: string;
let cookieOperator: string;
let periode: { id: string; version: number };

async function cookieMasuk(pengguna: PenggunaTes): Promise<string> {
  const { cookie } = await masuk(pengguna.username, pengguna.password);
  if (cookie === null) throw new Error('Login uji gagal.');
  return cookie;
}

function formImpor(
  isi: string | Uint8Array,
  opsi: { nama?: string; version?: number } = {},
): FormData {
  const form = new FormData();
  const bagian = typeof isi === 'string' ? isi : new Uint8Array(isi);
  // Tanpa MIME (seperti sebagian peramban); konsistensi MIME diuji di impor-xlsx.test.ts.
  form.set('file', new File([bagian], opsi.nama ?? 'ekspor-pbb.csv'));
  form.set('version', String(opsi.version ?? periode.version));
  return form;
}

async function impor(form: FormData, cookie = cookieAdmin): Promise<Response> {
  return POST(buatRequest(`/api/periode/${periode.id}/impor`, { multipart: form, cookie }), {
    params: Promise.resolve({ id: periode.id }),
  });
}

async function galat(respons: Response): Promise<IsiGalat['error'] & { status: number }> {
  return { status: respons.status, ...((await respons.json()) as IsiGalat).error };
}

function csv(...baris: string[]): string {
  return [HEADER_IMPOR.join(';'), ...baris].join('\n');
}

const BARIS_LOLOS =
  '160999000000000101;1609990101900101;WAJIB PAJAK;JL. A;DUSUN A;MUARADUA;PASAR;10/06/2022;12/07/2023;05/08/2024;20/08/2025;11/08/2026';

beforeAll(async () => {
  getLimiterGagal('login').resetSemua();
  admin = await buatPengguna({ peran: 'ADMIN' });
  cookieAdmin = await cookieMasuk(admin);
  cookieOperator = await cookieMasuk(await buatPengguna({ peran: 'OPERATOR' }));
});

beforeEach(async () => {
  await bersihkanPeriode();
  periode = await buatPeriodeTes(admin.id);
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

describe('POST /api/periode/:id/impor', () => {
  it('fixture campuran: ringkasan dan semua kode alasan sesuai, version naik, audit tercatat', async () => {
    const respons = await impor(formImpor(CSV_CAMPURAN));

    expect(respons.status).toBe(200);
    const ringkasan = (await respons.json()) as Ringkasan & Record<string, unknown>;
    expect(ringkasan).toMatchObject({
      namaFile: 'ekspor-pbb.csv',
      totalBaris: 33,
      jumlahLolos: 7,
      jumlahGugur: 26,
      lolosPerWilayah: { W1: 0, W2: 0, BELUM_DIPETAKAN: 7 },
      nikTidakValid: 2,
      nopGanda: 1,
      kecamatanBelumDipetakan: ['BUAY RUNJUNG', 'KISAM TINGGI', 'MUARADUA'],
      version: 2,
    });
    const tahun = [2022, 2023, 2024, 2025, 2026];
    const semuaAlasan = {
      NOP_INVALID: 1,
      NOP_DUPLICATE: 2,
      NAMA_KOSONG: 1,
      KECAMATAN_KOSONG: 1,
      FORMAT_BARIS: 1,
      ...Object.fromEntries(
        [
          'TANGGAL_KOSONG',
          'TANGGAL_TIDAK_DIKENALI',
          'TANGGAL_SEBELUM_TAHUN_PAJAK',
          'LEWAT_BATAS',
        ].flatMap((jenis) => tahun.map((t) => [`${jenis}_${t.toString()}`, 1])),
      ),
    };
    expect(ringkasan.gugurPerAlasan).toEqual(semuaAlasan);
    expect(Object.keys(ringkasan.gugurPerAlasan).slice(0, 3)).toEqual([
      'NOP_INVALID',
      'NOP_DUPLICATE',
      'NAMA_KOSONG',
    ]);

    expect(await getDb().peserta.count({ where: { periodeId: periode.id } })).toBe(33);
    const jejak = await auditUntuk({ targetId: periode.id, aksi: 'IMPOR_BERHASIL' });
    expect(jejak).toHaveLength(1);
    expect(jejak[0]?.payload).toMatchObject({
      imporId: ringkasan.imporId,
      namaFile: 'ekspor-pbb.csv',
      totalBaris: 33,
      jumlahLolos: 7,
      pesertaLamaDiganti: 0,
    });
    const respRingkasan = await ringkasanGet(
      buatRequest(`/api/periode/${periode.id}/ringkasan`, { cookie: cookieAdmin }),
      { params: Promise.resolve({ id: periode.id }) },
    );
    expect(await respRingkasan.json()).toEqual(ringkasan);
  });

  it('menyimpan data dirapikan, NIK terenkripsi utuh, dan alasan per baris', async () => {
    await impor(formImpor(CSV_CAMPURAN));
    const db = getDb();

    const dua = await db.peserta.findFirstOrThrow({ where: { periodeId: periode.id, baris: 3 } });
    expect(dua).toMatchObject({
      nop: '160999000000000002',
      kecamatanRaw: 'muaradua',
      kecamatan: 'MUARADUA',
      nikMasked: '1609xxxxxxxx0002',
      nikValid: true,
      eligible: true,
      alasan: [],
    });
    expect(dekripsiNik(dua.nikEnc ?? new Uint8Array())).toBe('1609990101900002');
    expect(Buffer.from(dua.nikEnc ?? []).toString('latin1')).not.toContain('1609990101900002');
    expect(dua.lunas2025?.toISOString()).toBe('2026-04-13T03:00:00.000Z');

    const satu = await db.peserta.findFirstOrThrow({ where: { periodeId: periode.id, baris: 2 } });
    expect(satu.alamatWp).toBe('JL. MAWAR; GG. 2');
    const bertitik = await db.peserta.findFirstOrThrow({
      where: { periodeId: periode.id, baris: 7 },
    });
    expect(bertitik).toMatchObject({ nop: '160999000000000006', nikEnc: null, nikMasked: '-' });
    const nikIlmiah = await db.peserta.findFirstOrThrow({
      where: { periodeId: periode.id, baris: 6 },
    });
    expect(nikIlmiah).toMatchObject({ nikValid: false, nikMasked: '-', eligible: true });
    const ganda = await db.peserta.findMany({
      where: { periodeId: periode.id, nop: '160999000000000009' },
      orderBy: { baris: 'asc' },
    });
    expect(ganda.map((p) => p.alasan)).toEqual([['NOP_DUPLICATE'], ['NOP_DUPLICATE']]);
    const lewat = await db.peserta.findFirstOrThrow({
      where: { periodeId: periode.id, baris: 34 },
    });
    expect(lewat).toMatchObject({ eligible: false, alasan: ['LEWAT_BATAS_2026'] });
    expect(lewat.lunasRaw).toMatchObject({ 2026: '01/10/2026 00:00:00' });
  });

  it('impor ulang mengganti seluruh peserta dan menonaktifkan impor lama', async () => {
    const pertama = (await (await impor(formImpor(CSV_CAMPURAN))).json()) as Ringkasan;

    const respons = await impor(formImpor(csv(BARIS_LOLOS), { nama: 'ulang.csv', version: 2 }));

    expect(respons.status).toBe(200);
    expect(await respons.json()).toMatchObject({ totalBaris: 1, jumlahLolos: 1, version: 3 });
    const db = getDb();
    expect(await db.peserta.count({ where: { periodeId: periode.id } })).toBe(1);
    const semuaImpor = await db.impor.findMany({
      where: { periodeId: periode.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(semuaImpor.map((i) => [i.id === pertama.imporId, i.aktif])).toEqual([
      [true, false],
      [false, true],
    ]);
    const jejak = await auditUntuk({ targetId: periode.id, aksi: 'IMPOR_BERHASIL' });
    expect(jejak[1]?.payload).toMatchObject({ pesertaLamaDiganti: 33 });
  });

  it('header salah → 400 HEADER_TIDAK_SESUAI, 0 baris tersimpan, IMPOR_DITOLAK di audit', async () => {
    const header = HEADER_IMPOR.map((k) => (k === 'Tanggal Lunas 2024' ? 'TGL_2024' : k));
    const isi = [header.join(';'), BARIS_LOLOS].join('\n');

    const respons = await impor(formImpor(isi));

    expect(await galat(respons)).toMatchObject({
      status: 400,
      code: 'HEADER_TIDAK_SESUAI',
      message:
        'Header file tidak sesuai. Kolom hilang: Tanggal Lunas 2024. Kolom tidak dikenal: TGL_2024.',
      details: { hilang: ['Tanggal Lunas 2024'], tidakDikenal: ['TGL_2024'] },
    });
    expect(await getDb().peserta.count()).toBe(0);
    expect(await getDb().impor.count()).toBe(0);
    const jejak = await auditUntuk({ targetId: periode.id, aksi: 'IMPOR_DITOLAK' });
    expect(jejak[0]?.payload).toMatchObject({
      kode: 'HEADER_TIDAK_SESUAI',
      hilang: ['Tanggal Lunas 2024'],
    });
    const baris = await getDb().periode.findUniqueOrThrow({ where: { id: periode.id } });
    expect(baris.version).toBe(1);
  });

  it('header dengan BOM, huruf besar-kecil berbeda, dan CRLF tetap diterima', async () => {
    const header = HEADER_IMPOR.map((k) => ` ${k.toUpperCase()}`).join(';');
    const isi = `\uFEFF${header}\r\n${BARIS_LOLOS}\r\n\r\n`;

    const respons = await impor(formImpor(isi));

    expect(await respons.json()).toMatchObject({ totalBaris: 1, jumlahLolos: 1 });
  });

  it.each([
    ['hanya header', csv(), 'File tidak berisi data peserta.'],
    ['kosong', '', 'File tidak berisi data peserta.'],
  ])('file %s ditolak FILE_TIDAK_VALID', async (_kasus, isi, pesan) => {
    expect(await galat(await impor(formImpor(isi)))).toMatchObject({
      status: 400,
      code: 'FILE_TIDAK_VALID',
      message: pesan,
    });
  });

  it('file biner ditolak dengan pesan simpan ulang (CSV Windows-1252 diuji di impor-xlsx.test.ts)', async () => {
    const biner = new Uint8Array([0x41, 0x42, 0x00, 0x43]);

    expect(await galat(await impor(formImpor(biner)))).toMatchObject({
      code: 'FILE_TIDAK_VALID',
      message: 'File tidak dapat dibaca. Simpan ulang sebagai CSV UTF-8.',
    });
  });

  it('ekstensi selain .csv/.xlsx ditolak; isi bukan zip berekstensi .xlsx ditolak', async () => {
    expect(
      await galat(await impor(formImpor(csv(BARIS_LOLOS), { nama: 'data.txt' }))),
    ).toMatchObject({
      code: 'FILE_TIDAK_VALID',
      message: 'File harus .csv atau .xlsx, maksimal 20 MB.',
    });
    expect((await galat(await impor(formImpor('x', { nama: 'data.XLSX' })))).message).toMatch(
      /^Isi file tidak sesuai ekstensinya/,
    );
  });

  it('file lebih dari 20 MB ditolak 413', async () => {
    const besar = new Uint8Array(20 * 1024 * 1024 + 1).fill(0x41);

    expect(await galat(await impor(formImpor(besar)))).toMatchObject({
      status: 413,
      code: 'FILE_TERLALU_BESAR',
    });
  });

  it('periode bukan Draf → 409 PERIODE_TERKUNCI tanpa mengubah data', async () => {
    await aturStatusPeriode(periode.id, 'TERKUNCI');

    expect(await galat(await impor(formImpor(CSV_CAMPURAN)))).toMatchObject({
      status: 409,
      code: 'PERIODE_TERKUNCI',
      message: 'Periode sudah terkunci. Data tidak dapat diubah.',
    });
    expect(await getDb().peserta.count()).toBe(0);
  });

  it('version basi → 409 CONFLICT', async () => {
    expect(await galat(await impor(formImpor(CSV_CAMPURAN, { version: 5 })))).toMatchObject({
      status: 409,
      code: 'CONFLICT',
      details: { version: 1 },
    });
  });

  it('isian form tidak lengkap → 400 dengan pesan per field', async () => {
    const form = new FormData();
    form.set('version', 'abc');
    form.set('lain', 'x');

    expect(await galat(await impor(form))).toMatchObject({
      status: 400,
      code: 'VALIDASI_GAGAL',
      details: { fields: { file: 'Pilih file .csv atau .xlsx.', lain: 'Field tidak dikenal.' } },
    });
  });

  it('Operator ditolak 403; ringkasan sebelum impor 404', async () => {
    expect((await galat(await impor(formImpor(CSV_CAMPURAN), cookieOperator))).code).toBe(
      'AKSES_DITOLAK',
    );
    const kosong = await ringkasanGet(
      buatRequest(`/api/periode/${periode.id}/ringkasan`, { cookie: cookieAdmin }),
      { params: Promise.resolve({ id: periode.id }) },
    );
    expect(await galat(kosong)).toMatchObject({
      status: 404,
      message: 'Belum ada data peserta.',
    });
  });

  it('respons dan audit tidak memuat NIK utuh', async () => {
    const respons = await impor(formImpor(CSV_CAMPURAN));
    const teks = await respons.text();
    const jejak = JSON.stringify(await auditUntuk({ targetId: periode.id }));

    for (const isi of [teks, jejak]) {
      expect(isi).not.toMatch(/\b\d{16}\b/);
    }
  });
});
