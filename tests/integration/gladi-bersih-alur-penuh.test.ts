import { unzipSync, strFromU8 } from 'fflate';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST as periodePost } from '@/app/api/periode/route';
import { POST as kunciPost } from '@/app/api/periode/[id]/kunci/route';
import { GET as paketGet } from '@/app/api/periode/[id]/paket/route';
import { POST as hasilPost } from '@/app/api/periode/[id]/hasil/route';
import { POST as verifikasiPost } from '@/app/api/periode/[id]/pemenang/[slot]/verifikasi/route';
import { POST as gugurPost } from '@/app/api/periode/[id]/pemenang/[slot]/gugur/route';
import { PUT as beritaAcaraPut } from '@/app/api/periode/[id]/berita-acara/route';
import { GET as beritaAcaraPdfGet } from '@/app/api/periode/[id]/berita-acara/pdf/route';
import { POST as publikasiPost } from '@/app/api/periode/[id]/publikasi/route';
import { GET as pemenangPublikGet } from '@/app/api/publik/pemenang/route';
import { PUT as temaPut } from '@/app/api/periode/[id]/tema/route';

import { bangunFileHasil } from '@/lib/draw/hasil';
import { type StateUndian } from '@/lib/draw/types';
import { ID_TEMA_DEFAULT, pastikanTemaDanAsetBawaan } from '@/server/services/tema';
import { getDb, tutupDb } from '@/server/db';
import { enkripsiNik } from '@/server/nik';

import { buatCookieSesi, buatRequest } from './helpers/aplikasi';
import { buatPengguna, type PenggunaTes } from './helpers/pengguna';
import { bersihkanPeriode } from './helpers/periode';

let admin: PenggunaTes;
let operator: PenggunaTes;
let cookieAdmin: string;
let cookieOperator: string;

beforeAll(async () => {
  admin = await buatPengguna({ peran: 'ADMIN' });
  operator = await buatPengguna({ peran: 'OPERATOR' });
  cookieAdmin = await buatCookieSesi({ sub: admin.id, loginAt: Date.now() });
  cookieOperator = await buatCookieSesi({ sub: operator.id, loginAt: Date.now() });

  // Pastikan tema default tersedia
  await pastikanTemaDanAsetBawaan(getDb(), admin.id);
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

function paramsSlot(id: string, slot: string): { params: Promise<{ id: string; slot: string }> } {
  return { params: Promise.resolve({ id, slot }) };
}

describe('Tiket 28: Gladi Bersih Penuh (Simulasi Alur Kritis End-to-End)', () => {
  it('menjalankan seluruh siklus undian dari pembuatan periode hingga publikasi resmi tanpa cacat', async () => {
    const db = getDb();

    // 1. Admin membuat periode baru
    const reqBuat = buatRequest('/api/periode', {
      method: 'POST',
      cookie: cookieAdmin,
      json: {
        judul: 'Undian Umroh Simulasi Gladi Bersih 2026',
        batasLunas: '2026-09-30T23:59:59+07:00',
        namaWilayah: {
          W1: 'Wilayah Satu (Eks Muaradua)',
          W2: 'Wilayah Dua (Eks Banding Agung)',
        },
      },
    });
    const resBuat = await periodePost(reqBuat);
    expect(resBuat.status).toBe(201);
    const dataPeriode = await resBuat.json();
    const periodeId = dataPeriode.id;

    // Ambil wilayah W1 dan W2 yang dibuat otomatis
    const w1 = await db.wilayah.findFirstOrThrow({ where: { periodeId, kode: 'W1' } });
    const w2 = await db.wilayah.findFirstOrThrow({ where: { periodeId, kode: 'W2' } });

    // 2. Impor peserta dan pemetaan kecamatan ke wilayah
    const impor = await db.impor.create({
      data: {
        periodeId,
        namaFile: 'data-gladi-bersih.xlsx',
        fileSha256: 'g'.repeat(64),
        totalBaris: 8,
        jumlahLolos: 8,
        jumlahGugur: 0,
        ringkasan: {
          gugurPerAlasan: {},
          nikTidakValid: 0,
          nopGanda: 0,
          lolosPerKecamatan: { MUARADUA: 4, BANDING: 4 },
        },
        importedById: admin.id,
      },
    });

    await db.kecamatanWilayah.createMany({
      data: [
        { periodeId, kecamatan: 'MUARADUA', wilayahId: w1.id },
        { periodeId, kecamatan: 'BANDING', wilayahId: w2.id },
      ],
    });

    // Buat 4 peserta lolos W1
    for (let i = 1; i <= 4; i++) {
      await db.peserta.create({
        data: {
          periodeId,
          imporId: impor.id,
          baris: i + 1,
          nop: `16090100000000000${i.toString()}`,
          nikEnc: Uint8Array.from(enkripsiNik(`160901010190000${i.toString()}`)),
          nikMasked: `1609xxxxxxxx000${i.toString()}`,
          nikValid: true,
          nama: `Peserta W1 Nomor ${i.toString()}`,
          alamatWp: 'Alamat WP Muaradua',
          alamatOp: 'Alamat OP Muaradua',
          kecamatanRaw: 'MUARADUA',
          kecamatan: 'MUARADUA',
          kelurahan: 'Kelurahan Pasar',
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

    // Buat 4 peserta lolos W2
    for (let i = 5; i <= 8; i++) {
      await db.peserta.create({
        data: {
          periodeId,
          imporId: impor.id,
          baris: i + 1,
          nop: `16090200000000000${i.toString()}`,
          nikEnc: Uint8Array.from(enkripsiNik(`160902010190000${i.toString()}`)),
          nikMasked: `1609xxxxxxxx000${i.toString()}`,
          nikValid: true,
          nama: `Peserta W2 Nomor ${i.toString()}`,
          alamatWp: 'Alamat WP Banding',
          alamatOp: 'Alamat OP Banding',
          kecamatanRaw: 'BANDING',
          kecamatan: 'BANDING',
          kelurahan: 'Kelurahan Danau',
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

    // 3. Admin memilih tema undian aktif
    const reqPilihTema = buatRequest(`/api/periode/${periodeId}/tema`, {
      method: 'PUT',
      cookie: cookieAdmin,
      json: { temaId: ID_TEMA_DEFAULT },
    });
    const resPilihTema = await temaPut(reqPilihTema, paramsId(periodeId));
    expect(resPilihTema.status).toBe(200);

    // 4. Admin mengunci data periode (Freeze Data)
    const reqKunci = buatRequest(`/api/periode/${periodeId}/kunci`, {
      method: 'POST',
      cookie: cookieAdmin,
      json: {
        version: 1,
        konfirmasiJudul: 'Undian Umroh Simulasi Gladi Bersih 2026',
      },
    });
    const resKunci = await kunciPost(reqKunci, paramsId(periodeId));
    expect(resKunci.status).toBe(200);
    const dataKunci = await resKunci.json();
    expect(dataKunci.snapshotHash).toBeDefined();

    // 5. Admin mengunduh paket undian .zip resmi untuk diserahkan ke laptop acara
    const reqPaket = buatRequest(`/api/periode/${periodeId}/paket`, {
      cookie: cookieAdmin,
    });
    const resPaket = await paketGet(reqPaket, paramsId(periodeId));
    expect(resPaket.status).toBe(200);
    expect(resPaket.headers.get('content-type')).toBe('application/zip');
    const paketBuffer = new Uint8Array(await resPaket.arrayBuffer());

    // Validasi isi paket zip offline
    const unzipped = unzipSync(paketBuffer);
    expect(unzipped['manifest.json']).toBeDefined();
    expect(unzipped['snapshot.json']).toBeDefined();
    expect(unzipped['meta.json']).toBeDefined();
    expect(unzipped['tema/theme.json']).toBeDefined();

    const snapshotKanonik = JSON.parse(strFromU8(unzipped['snapshot.json']!));
    expect(snapshotKanonik.peserta.length).toBe(8);

    // 6. Simulasi undian offline 6 slot di panggung acara
    const snapshotDb = await db.snapshot.findUniqueOrThrow({
      where: { periodeId },
      include: { peserta: { orderBy: { urut: 'asc' } } },
    });

    const poolW1 = snapshotDb.peserta.filter((p) => p.wilayah === 'W1');
    const poolW2 = snapshotDb.peserta.filter((p) => p.wilayah === 'W2');

    function toPesertaUndian(sp: (typeof snapshotDb.peserta)[number], nama: string) {
      return {
        urut: sp.urut,
        wilayah: sp.wilayah,
        nopMasked: sp.nop,
        nikMasked: '1609xxxxxxxx0001',
        nama,
        alamatWp: 'Alamat WP',
        alamatOp: 'Alamat OP',
        kecamatan: 'MUARADUA',
        kelurahan: 'Pasar',
        lunas: [
          '2022-06-01T00:00:00Z',
          '2023-06-01T00:00:00Z',
          '2024-06-01T00:00:00Z',
          '2025-06-01T00:00:00Z',
          '2026-06-01T00:00:00Z',
        ],
      };
    }

    const lockedMs = new Date(snapshotDb.lockedAt).getTime();
    const stateUndian: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 1,
      dimulaiAt: new Date(lockedMs + 5_000).toISOString(),
      selesaiAt: new Date(lockedMs + 30_000).toISOString(),
      slotSelesai: [
        {
          urutan: 1,
          kode: 'W1-UTAMA',
          urut: poolW1[0]!.urut,
          diundiAt: new Date(lockedMs + 10_000).toISOString(),
          pemenang: toPesertaUndian(poolW1[0]!, 'Pemenang Slot 1 W1'),
        },
        {
          urutan: 2,
          kode: 'W2-UTAMA',
          urut: poolW2[0]!.urut,
          diundiAt: new Date(lockedMs + 20_000).toISOString(),
          pemenang: toPesertaUndian(poolW2[0]!, 'Pemenang Slot 2 W2'),
        },
      ],
      catatanLokal: [],
    };

    // 7. Bangun paket file hasil .zip
    const fileHasil = await bangunFileHasil({
      periodeId,
      snapshotHash: dataKunci.snapshotHash,
      temaConfigHash: 'c'.repeat(64),
      perangkat: { id: 'laptop-panggung-01', userAgent: 'Chrome-Gladi-Bersih' },
      state: stateUndian,
    });

    // 8. Operator mengunggah paket hasil ke server
    const reqHasil = buatRequest(`/api/periode/${periodeId}/hasil`, {
      method: 'POST',
      cookie: cookieOperator,
      json: fileHasil,
    });
    const resHasil = await hasilPost(reqHasil, paramsId(periodeId));
    expect(resHasil.status).toBe(200);
    const jsonHasil = await resHasil.json();
    expect(jsonHasil.status).toBe('DIUNDI');
    expect(jsonHasil.slot.length).toBe(2);

    // Verifikasi status periode berubah jadi DIUNDI
    const pDiundi = await db.periode.findUniqueOrThrow({ where: { id: periodeId } });
    expect(pDiundi.status).toBe('DIUNDI');

    // 9. Admin memverifikasi pemenang slot W1-UTAMA dan W2-UTAMA
    const reqVerifW1 = buatRequest(`/api/periode/${periodeId}/pemenang/W1-UTAMA/verifikasi`, {
      method: 'POST',
      cookie: cookieAdmin,
      json: {
        version: 1,
        catatan: 'Pemenang utama Wilayah 1 sah dan memenuhi syarat',
      },
    });
    const resVerifW1 = await verifikasiPost(reqVerifW1, paramsSlot(periodeId, 'W1-UTAMA'));
    expect(resVerifW1.status).toBe(200);

    const reqVerifW2 = buatRequest(`/api/periode/${periodeId}/pemenang/W2-UTAMA/verifikasi`, {
      method: 'POST',
      cookie: cookieAdmin,
      json: {
        version: 1,
        catatan: 'Pemenang utama Wilayah 2 sah dan memenuhi syarat',
      },
    });
    const resVerifW2 = await verifikasiPost(reqVerifW2, paramsSlot(periodeId, 'W2-UTAMA'));
    expect(resVerifW2.status).toBe(200);

    // Verifikasi kedua slot berstatus TERVERIFIKASI dan penerima aktif
    const slot1 = await db.slotHasil.findFirstOrThrow({
      where: { periodeId, slot: 'W1_UTAMA' },
    });
    expect(slot1.status).toBe('TERVERIFIKASI');
    expect(slot1.penerimaAktif).toBe(true);

    const slot2 = await db.slotHasil.findFirstOrThrow({
      where: { periodeId, slot: 'W2_UTAMA' },
    });
    expect(slot2.status).toBe('TERVERIFIKASI');
    expect(slot2.penerimaAktif).toBe(true);

    // 10. Admin menyimpan Berita Acara dan mengunduh berkas PDF resmi
    const reqSimpanBa = buatRequest(`/api/periode/${periodeId}/berita-acara`, {
      method: 'PUT',
      cookie: cookieAdmin,
      json: {
        nomor: '001/BA-UMROH/2026',
        tempat: 'Gedung Kesenian Muaradua',
        hariTanggal: 'Kamis, 15 Oktober 2026',
        dasarKegiatan: 'Keputusan Bupati OKU Selatan tentang Penyelenggaraan Undian Umroh PBB-P2 2026',
        panitia: [
          { nama: 'Panitia Satu, SE', jabatan: 'Ketua Panitia' },
          { nama: 'Panitia Dua, MM', jabatan: 'Sekretaris' },
        ],
        saksi: [
          { nama: 'Saksi Satu, SH', instansi: 'Notaris' },
          { nama: 'Saksi Dua, S.IK', instansi: 'Kepolisian' },
        ],
        version: 1,
      },
    });
    const resSimpanBa = await beritaAcaraPut(reqSimpanBa, paramsId(periodeId));
    expect(resSimpanBa.status).toBe(200);

    const reqPdf = buatRequest(`/api/periode/${periodeId}/berita-acara/pdf`, {
      cookie: cookieAdmin,
    });
    const resPdf = await beritaAcaraPdfGet(reqPdf, paramsId(periodeId));
    expect(resPdf.status).toBe(200);
    expect(resPdf.headers.get('content-disposition')?.toLowerCase()).toContain('berita_acara');
    expect(resPdf.headers.get('content-disposition')).toContain('.pdf');

    // 11. Admin mempublikasikan periode (DIPUBLIKASI)
    const pSebelumPublikasi = await db.periode.findUniqueOrThrow({ where: { id: periodeId } });
    const reqPublikasi = buatRequest(`/api/periode/${periodeId}/publikasi`, {
      method: 'POST',
      cookie: cookieAdmin,
      json: {
        version: pSebelumPublikasi.version,
      },
    });
    const resPublikasi = await publikasiPost(reqPublikasi, paramsId(periodeId));
    expect(resPublikasi.status).toBe(200);

    // 12. Verifikasi akses publik: 6 slot tampil dengan NIK/NOP tersamar
    const reqPublik = buatRequest('/api/publik/pemenang');
    const resPublik = await pemenangPublikGet(reqPublik);
    expect(resPublik.status).toBe(200);
    const jsonPublik = await resPublik.json();
    expect(jsonPublik.status).toBe('DIPUBLIKASI');
    const totalSlotPublik = jsonPublik.wilayah.reduce(
      (acc: number, w: { slot: unknown[] }) => acc + w.slot.length,
      0,
    );
    expect(totalSlotPublik).toBe(6);

    // Pastikan tidak ada NIK utuh yang bocor di respons publik
    const stringPublik = JSON.stringify(jsonPublik);
    expect(/\b1609\d{12}\b/.test(stringPublik)).toBe(false);
  });
});
