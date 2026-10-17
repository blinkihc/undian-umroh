import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { GET as baGet, PUT as baPut } from '@/app/api/periode/[id]/berita-acara/route';
import { GET as pdfGet } from '@/app/api/periode/[id]/berita-acara/pdf/route';
import { GET as eksporPemenangGet } from '@/app/api/periode/[id]/ekspor/pemenang/route';
import { GET as eksporAuditGet } from '@/app/api/periode/[id]/ekspor/audit/route';
import { POST as publikasiPost } from '@/app/api/periode/[id]/publikasi/route';
import { GET as pemenangPublikGet } from '@/app/api/publik/pemenang/route';
import { POST as cekPost } from '@/app/api/publik/cek/route';
import { POST as buatPeriodePost } from '@/app/api/periode/route';
import { getDb, tutupDb } from '@/server/db';
import { enkripsiNik } from '@/server/nik';
import { netralkanFormulaExcel } from '@/lib/domain/berita-acara';

import { buatRequest, masuk } from './helpers/aplikasi';
import { buatPengguna, type PenggunaTes } from './helpers/pengguna';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';

let admin: PenggunaTes;
let cookieAdmin: string;

beforeAll(async () => {
  admin = await buatPengguna({ peran: 'ADMIN' });
  const { cookie } = await masuk(admin.username, admin.password);
  if (cookie === null) throw new Error('Login admin gagal');
  cookieAdmin = cookie;
});

beforeEach(async () => {
  await bersihkanPeriode();
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

function paramsId(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function siapkanDataLengkap() {
  const db = getDb();
  const periodeAwal = await buatPeriodeTes(admin.id);

  // Buat impor aktif
  const impor = await db.impor.create({
    data: {
      periodeId: periodeAwal.id,
      namaFile: 'data-peserta-2026.xlsx',
      fileSha256: 'a'.repeat(64),
      totalBaris: 10,
      jumlahLolos: 8,
      jumlahGugur: 2,
      ringkasan: {},
      importedById: admin.id,
    },
  });

  // Peserta 1 (Lolos, Muaradua -> W1)
  const nopLolos = '160903000300300030';
  const nikLolos = '1609031201900001';
  const peserta1 = await db.peserta.create({
    data: {
      periodeId: periodeAwal.id,
      imporId: impor.id,
      baris: 2,
      nop: nopLolos,
      nikEnc: Uint8Array.from(enkripsiNik(nikLolos)),
      nikMasked: '1609**********01',
      nikValid: true,
      nama: 'Wajib Pajak Teladan Satu',
      alamatWp: 'Jl. Merdeka No. 10',
      alamatOp: 'Jl. Merdeka No. 10',
      kecamatanRaw: 'MUARADUA',
      kecamatan: 'MUARADUA',
      kelurahan: 'Pasar Muaradua',
      eligible: true,
      alasan: [],
      lunasRaw: {
        '2022': '10/05/2022',
        '2023': '10/05/2023',
        '2024': '10/05/2024',
        '2025': '10/05/2025',
        '2026': '10/05/2026',
      },
    },
  });

  // Peserta 2 (Gugur karena tanggal kosong)
  const nopGugur = '160903000300300031';
  const nikGugur = '1609031201900002';
  const peserta2 = await db.peserta.create({
    data: {
      periodeId: periodeAwal.id,
      imporId: impor.id,
      baris: 3,
      nop: nopGugur,
      nikEnc: Uint8Array.from(enkripsiNik(nikGugur)),
      nikMasked: '1609**********02',
      nikValid: true,
      nama: 'Wajib Pajak Gugur Dua',
      alamatWp: 'Jl. Sudirman No. 5',
      alamatOp: 'Jl. Sudirman No. 5',
      kecamatanRaw: 'MUARADUA',
      kecamatan: 'MUARADUA',
      kelurahan: 'Pasar Muaradua',
      eligible: false,
      alasan: ['TANGGAL_KOSONG_2024'],
      lunasRaw: { '2022': '10/05/2022', '2023': '10/05/2023' },
    },
  });

  // Snapshot
  await db.snapshot.create({
    data: {
      periodeId: periodeAwal.id,
      hash: 'b'.repeat(64),
      jumlahW1: 5,
      jumlahW2: 3,
      filePath: 'snapshots/test.json',
      lockedById: admin.id,
    },
  });

  // Hasil Undian
  const hasil = await db.hasilUndian.create({
    data: {
      periodeId: periodeAwal.id,
      hasilHash: 'c'.repeat(64),
      snapshotHash: 'b'.repeat(64),
      isi: {},
      dimulaiAt: new Date(),
      selesaiAt: new Date(),
      uploadedById: admin.id,
    },
  });

  // Slot Hasil W1_UTAMA
  await db.slotHasil.create({
    data: {
      periodeId: periodeAwal.id,
      hasilId: hasil.id,
      slot: 'W1_UTAMA',
      wilayah: 'W1',
      urutan: 1,
      snapshotUrut: 1,
      diundiAt: new Date(),
      pesertaId: peserta1.id,
      status: 'TERVERIFIKASI',
      penerimaAktif: true,
      statusChangedById: admin.id,
    },
  });

  // Update periode ke DIUNDI
  const periode = await db.periode.update({
    where: { id: periodeAwal.id },
    data: { status: 'DIUNDI', version: 2 },
  });

  return { periode, nopLolos, nopGugur, nikLolos, nikGugur, peserta1, peserta2 };
}

describe('Batch 1: Tiket 19 - Berita Acara PDF & Ekspor Excel', () => {
  it('netralkanFormulaExcel mencegah injeksi rumus spreadsheet', () => {
    expect(netralkanFormulaExcel('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(netralkanFormulaExcel('+12345')).toBe("'+12345");
    expect(netralkanFormulaExcel('-cmd|...')).toBe("'-cmd|...");
    expect(netralkanFormulaExcel('@SUM')).toBe("'@SUM");
    expect(netralkanFormulaExcel('Normal Text')).toBe('Normal Text');
  });

  it('mengisi form berita acara dan mendeteksi optimistic concurrency conflict', async () => {
    const { periode } = await siapkanDataLengkap();

    // GET berita acara pertama kali
    const getRes = await baGet(
      buatRequest(`/api/periode/${periode.id}/berita-acara`, {
        method: 'GET',
        cookie: cookieAdmin,
      }),
      paramsId(periode.id),
    );
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.tersedia).toBe(true);
    expect(getData.version).toBe(0);

    // Simpan berita acara
    const putRes = await baPut(
      buatRequest(`/api/periode/${periode.id}/berita-acara`, {
        method: 'PUT',
        cookie: cookieAdmin,
        json: {
          nomor: '973/01/BA/2026',
          tempat: 'Aula Bapenda OKU Selatan',
          hariTanggal: 'Senin, 12 Oktober 2026',
          dasarKegiatan: 'Keputusan Bupati OKU Selatan Nomor 123/2026',
          panitia: [{ nama: 'Drs. Panitia Satu', jabatan: 'Ketua Panitia' }],
          saksi: [{ nama: 'Saksi Notaris SH', instansi: 'Kantor Notaris' }],
          version: 1,
        },
      }),
      paramsId(periode.id),
    );
    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.version).toBe(1);
    expect(putData.nomor).toBe('973/01/BA/2026');

    // Update kedua berhasil menaikkan version menjadi 2
    const putRes2 = await baPut(
      buatRequest(`/api/periode/${periode.id}/berita-acara`, {
        method: 'PUT',
        cookie: cookieAdmin,
        json: {
          nomor: '973/02/BA/2026',
          tempat: 'Aula Bapenda OKU Selatan',
          hariTanggal: 'Senin, 12 Oktober 2026',
          dasarKegiatan: 'Keputusan Bupati OKU Selatan Nomor 123/2026',
          panitia: [{ nama: 'Drs. Panitia Satu', jabatan: 'Ketua Panitia' }],
          saksi: [{ nama: 'Saksi Notaris SH', instansi: 'Kantor Notaris' }],
          version: 1,
        },
      }),
      paramsId(periode.id),
    );
    expect(putRes2.status).toBe(200);
    const putData2 = await putRes2.json();
    expect(putData2.version).toBe(2);

    // Concurrency conflict jika mengirim version basi (1 padahal DB sudah 2)
    const conflictRes = await baPut(
      buatRequest(`/api/periode/${periode.id}/berita-acara`, {
        method: 'PUT',
        cookie: cookieAdmin,
        json: {
          nomor: '973/03/BA/2026',
          tempat: 'Aula',
          hariTanggal: 'Senin',
          dasarKegiatan: 'Dasar',
          panitia: [],
          saksi: [],
          version: 1,
        },
      }),
      paramsId(periode.id),
    );
    expect(conflictRes.status).toBe(409);
  });

  it('mengunduh PDF Berita Acara tanpa membocorkan NIK atau NOP utuh', async () => {
    const { periode, nopLolos, nikLolos } = await siapkanDataLengkap();

    const res = await pdfGet(
      buatRequest(`/api/periode/${periode.id}/berita-acara/pdf`, {
        method: 'GET',
        cookie: cookieAdmin,
      }),
      paramsId(periode.id),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');

    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.slice(0, 5).toString('ascii')).toBe('%PDF-');

    // Periksa bahwa NIK utuh dan NOP utuh tidak tercetak dalam teks PDF
    const isiTeks = buffer.toString('latin1');
    expect(isiTeks).not.toContain(nikLolos);
    expect(isiTeks).not.toContain(nopLolos);
  });

  it('mengunduh Excel Pemenang dan Log Audit', async () => {
    const { periode } = await siapkanDataLengkap();

    const resPemenang = await eksporPemenangGet(
      buatRequest(`/api/periode/${periode.id}/ekspor/pemenang`, {
        method: 'GET',
        cookie: cookieAdmin,
      }),
      paramsId(periode.id),
    );
    expect(resPemenang.status).toBe(200);
    expect(resPemenang.headers.get('Content-Type')).toContain('spreadsheetml');
    const bufPemenang = Buffer.from(await resPemenang.arrayBuffer());
    expect(bufPemenang.slice(0, 2).toString('ascii')).toBe('PK'); // Zip/Xlsx magic bytes

    const resAudit = await eksporAuditGet(
      buatRequest(`/api/periode/${periode.id}/ekspor/audit`, {
        method: 'GET',
        cookie: cookieAdmin,
      }),
      paramsId(periode.id),
    );
    expect(resAudit.status).toBe(200);
    const bufAudit = Buffer.from(await resAudit.arrayBuffer());
    expect(bufAudit.slice(0, 2).toString('ascii')).toBe('PK');
  });
});

describe('Batch 1: Tiket 20 - Publikasi Hasil & Halaman /pemenang', () => {
  it('sebelum publikasi: hasil belum diumumkan; sesudah publikasi: data pemenang tampil tersamar', async () => {
    const { periode, nikLolos, nopLolos } = await siapkanDataLengkap();

    // Sebelum publikasi
    const resSebelum = await pemenangPublikGet(
      buatRequest('/api/publik/pemenang', { method: 'GET' }),
    );
    expect(resSebelum.status).toBe(200);
    const dataSebelum = await resSebelum.json();
    expect(dataSebelum.status).toBe('BELUM_DIUMUMKAN');

    // Admin mempublikasikan
    const resPublikasi = await publikasiPost(
      buatRequest(`/api/periode/${periode.id}/publikasi`, {
        method: 'POST',
        cookie: cookieAdmin,
        json: { version: periode.version },
      }),
      paramsId(periode.id),
    );
    expect(resPublikasi.status).toBe(200);
    const periodeBaru = await resPublikasi.json();
    expect(periodeBaru.status).toBe('DIPUBLIKASI');

    // Sesudah publikasi
    const resSesudah = await pemenangPublikGet(
      buatRequest('/api/publik/pemenang', { method: 'GET' }),
    );
    expect(resSesudah.status).toBe(200);
    const dataSesudah = await resSesudah.json();
    expect(dataSesudah.status).toBe('DIPUBLIKASI');
    expect(dataSesudah.integritas.snapshotHash).toBe('b'.repeat(64));
    expect(dataSesudah.integritas.hasilHash).toBe('c'.repeat(64));

    // Data tersamar dan tidak ada NIK/NOP utuh dalam teks respons
    const jsonStr = JSON.stringify(dataSesudah);
    expect(jsonStr).not.toContain(nikLolos);
    expect(jsonStr).not.toContain(nopLolos);

    // Melepaskan aturan satu periode aktif: admin bisa membuat periode baru
    const resPeriodeBaru = await buatPeriodePost(
      buatRequest('/api/periode', {
        method: 'POST',
        cookie: cookieAdmin,
        json: {
          judul: 'Undian Umroh Periode Berikutnya 2027',
          batasLunas: '2026-10-31T23:59:59+07:00',
        },
      }),
    );
    expect(resPeriodeBaru.status).toBe(201);
  });
});

describe('Batch 1: Tiket 21 - Cek NOP Publik (/cek)', () => {
  it('menolak NOP tidak valid (bukan 18 digit)', async () => {
    await siapkanDataLengkap();

    const res = await cekPost(
      buatRequest('/api/publik/cek', {
        method: 'POST',
        json: { nop: '12345' },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('NOP_INVALID');
    expect(data.pesan).toContain('18 digit');
  });

  it('mengembalikan status IKUT untuk NOP lolos tanpa membocorkan NIK', async () => {
    const { nopLolos, nikLolos } = await siapkanDataLengkap();

    const res = await cekPost(
      buatRequest('/api/publik/cek', {
        method: 'POST',
        json: { nop: nopLolos },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('IKUT');
    expect(data.nama).toBe('Wajib Pajak Teladan Satu');
    expect(data.nopMasked).toContain('xxx.xxx');

    const jsonStr = JSON.stringify(data);
    expect(jsonStr).not.toContain(nikLolos);
    expect(jsonStr).not.toContain(nopLolos);
  });

  it('mengembalikan status TIDAK_IKUT beserta alasan dalam bahasa Indonesia untuk NOP gugur', async () => {
    const { nopGugur, nikGugur } = await siapkanDataLengkap();

    const res = await cekPost(
      buatRequest('/api/publik/cek', {
        method: 'POST',
        json: { nop: nopGugur },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('TIDAK_IKUT');
    expect(data.nama).toBe('Wajib Pajak Gugur Dua');
    expect(data.alasan.length).toBeGreaterThan(0);
    expect(data.alasan[0]).toContain('2024');
    expect(data.petunjuk).toContain('Bapenda');

    const jsonStr = JSON.stringify(data);
    expect(jsonStr).not.toContain(nikGugur);
    expect(jsonStr).not.toContain(nopGugur);
  });

  it('mengembalikan status TIDAK_DITEMUKAN untuk NOP yang tidak ada di database', async () => {
    await siapkanDataLengkap();

    const nopGhaib = '160999999999999999';
    const res = await cekPost(
      buatRequest('/api/publik/cek', {
        method: 'POST',
        json: { nop: nopGhaib },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('TIDAK_DITEMUKAN');
    expect(data.pesan).toContain('Bapenda');
  });
});
