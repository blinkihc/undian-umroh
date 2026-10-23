import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { POST as gugurPost } from '@/app/api/periode/[id]/pemenang/[slot]/gugur/route';
import { POST as nikPost } from '@/app/api/periode/[id]/pemenang/[slot]/nik/route';
import { POST as verifikasiPost } from '@/app/api/periode/[id]/pemenang/[slot]/verifikasi/route';
import { DELETE as fotoDelete } from '@/app/api/periode/[id]/pemenang/[slot]/foto/[fotoId]/route';
import {
  PATCH as fotoPatch,
  POST as fotoPost,
} from '@/app/api/periode/[id]/pemenang/[slot]/foto/route';
import { GET as pemenangGet } from '@/app/api/periode/[id]/pemenang/route';
import { getDb, tutupDb } from '@/server/db';
import { enkripsiNik } from '@/server/nik';
import { type PemenangPeriodeRespons } from '@/server/services/pemenang';

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

function paramsId(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function paramsSlot(id: string, slot: string): { params: Promise<{ id: string; slot: string }> } {
  return { params: Promise.resolve({ id, slot }) };
}

async function siapkanPeriodeDiundi() {
  const db = getDb();
  const periodeAwal = await buatPeriodeTes(admin.id);
  const periode = await db.periode.update({
    where: { id: periodeAwal.id },
    data: { status: 'DIUNDI', version: 3 },
  });

  const w1 = await db.wilayah.findFirstOrThrow({
    where: { periodeId: periode.id, kode: 'W1' },
  });
  const w2 = await db.wilayah.findFirstOrThrow({
    where: { periodeId: periode.id, kode: 'W2' },
  });

  const impor = await db.impor.create({
    data: {
      periodeId: periode.id,
      namaFile: 'data-uji.xlsx',
      fileSha256: 'a'.repeat(64),
      totalBaris: 6,
      jumlahLolos: 6,
      jumlahGugur: 0,
      ringkasan: {},
      importedById: admin.id,
    },
  });

  const pesertaList = [];
  for (let i = 1; i <= 6; i++) {
    const isW1 = i <= 3;
    const nikAsli = `160901234567000${i.toString()}`;
    const p = await db.peserta.create({
      data: {
        periodeId: periode.id,
        imporId: impor.id,
        baris: i + 1,
        nop: `16090100000000000${i.toString()}`,
        nikEnc: new Uint8Array(enkripsiNik(nikAsli)),
        nikMasked: `1609xxxxxxxx000${i.toString()}`,
        nikValid: true,
        nama: `Peserta ${isW1 ? 'W1' : 'W2'} - ${i.toString()}`,
        alamatWp: 'Alamat WP OKU Selatan',
        alamatOp: 'Alamat OP OKU Selatan',
        kecamatanRaw: isW1 ? 'MUARADUA' : 'BANDING',
        kecamatan: isW1 ? 'MUARADUA' : 'BANDING',
        kelurahan: 'Kelurahan Uji',
        lunas2022: new Date('2022-06-01T00:00:00Z'),
        lunas2023: new Date('2023-06-01T00:00:00Z'),
        lunas2024: new Date('2024-06-01T00:00:00Z'),
        lunas2025: new Date('2025-06-01T00:00:00Z'),
        lunas2026: new Date('2026-06-01T00:00:00Z'),
        lunasRaw: { '2022': '01/06/2022' },
        eligible: true,
        alasan: [],
      },
    });
    pesertaList.push(p);
  }

  const snapshot = await db.snapshot.create({
    data: {
      periodeId: periode.id,
      hash: 'b'.repeat(64),
      jumlahW1: 3,
      jumlahW2: 3,
      filePath: 'snapshot/uji.json',
      lockedById: admin.id,
    },
  });

  for (let i = 0; i < 6; i++) {
    const p = pesertaList[i];
    if (p === undefined) throw new Error('Peserta undefined');
    await db.snapshotPeserta.create({
      data: {
        snapshotId: snapshot.id,
        urut: i + 1,
        pesertaId: p.id,
        nop: p.nop,
        wilayah: i < 3 ? 'W1' : 'W2',
      },
    });
  }

  const hasilUndian = await db.hasilUndian.create({
    data: {
      periodeId: periode.id,
      hasilHash: 'c'.repeat(64),
      snapshotHash: snapshot.hash,
      isi: {},
      dimulaiAt: new Date(),
      selesaiAt: new Date(),
      uploadedById: admin.id,
    },
  });

  const slotDefs = [
    { slot: 'W1_UTAMA' as const, urutan: 1, wilayah: 'W1' as const, isUtama: true, idx: 0 },
    { slot: 'W1_C1' as const, urutan: 2, wilayah: 'W1' as const, isUtama: false, idx: 1 },
    { slot: 'W1_C2' as const, urutan: 3, wilayah: 'W1' as const, isUtama: false, idx: 2 },
    { slot: 'W2_UTAMA' as const, urutan: 4, wilayah: 'W2' as const, isUtama: true, idx: 3 },
    { slot: 'W2_C1' as const, urutan: 5, wilayah: 'W2' as const, isUtama: false, idx: 4 },
    { slot: 'W2_C2' as const, urutan: 6, wilayah: 'W2' as const, isUtama: false, idx: 5 },
  ];

  for (const def of slotDefs) {
    const p = pesertaList[def.idx];
    if (p === undefined) throw new Error('Peserta undefined');
    await db.slotHasil.create({
      data: {
        hasilId: hasilUndian.id,
        periodeId: periode.id,
        slot: def.slot,
        urutan: def.urutan,
        wilayah: def.wilayah,
        snapshotUrut: def.idx + 1,
        pesertaId: p.id,
        diundiAt: new Date(),
        status: def.isUtama ? 'MENANG' : 'CADANGAN',
        penerimaAktif: def.isUtama,
        version: 1,
      },
    });
  }

  return {
    periode: await db.periode.findUniqueOrThrow({ where: { id: periode.id } }),
    w1,
    w2,
    pesertaList,
  };
}

describe('API Pemenang dan Kenaikan Cadangan Otomatis (Tiket 18)', () => {
  describe('GET /api/periode/:id/pemenang', () => {
    it('mengembalikan dua wilayah masing-masing tiga slot dengan data tersamar untuk Admin', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await pemenangGet(
        buatRequest(`/api/periode/${periode.id}/pemenang`, {
          cookie: cookieAdmin,
        }),
        paramsId(periode.id),
      );

      expect(respons.status).toBe(200);
      const data = (await respons.json()) as PemenangPeriodeRespons;

      expect(data.wilayah).toHaveLength(2);

      const w1 = data.wilayah.find((w) => w.kode === 'W1');
      expect(w1).toBeDefined();
      expect(w1?.statusWilayah).toBe('ADA_PENERIMA');
      expect(w1?.slot).toHaveLength(3);

      const utamaW1 = w1?.slot.find((s) => s.kode === 'W1-UTAMA');
      expect(utamaW1).toBeDefined();
      expect(utamaW1?.status).toBe('MENANG');
      expect(utamaW1?.penerimaAktif).toBe(true);
      expect(utamaW1?.peserta.nikMasked).toMatch(/^1609xxxxxxxx\d{4}$/);
      expect(utamaW1?.peserta.nopFormat).toMatch(/^16\.09\.\d{3}\.\d{3}\.\d{3}-\d{4}\.\d$/);

      const c1W1 = w1?.slot.find((s) => s.kode === 'W1-C1');
      expect(c1W1?.status).toBe('CADANGAN');
      expect(c1W1?.penerimaAktif).toBe(false);
    });

    it('menolak akses Operator dengan status 403', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await pemenangGet(
        buatRequest(`/api/periode/${periode.id}/pemenang`, {
          cookie: cookieOperator,
        }),
        paramsId(periode.id),
      );

      expect(respons.status).toBe(403);
    });
  });

  describe('POST /api/periode/:id/pemenang/:slot/verifikasi', () => {
    it('memverifikasi penerima aktif berstatus MENANG dan mencatat riwayat & audit', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await verifikasiPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/verifikasi`, {
          json: { version: 1 },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(respons.status).toBe(200);
      const data = (await respons.json()) as PemenangPeriodeRespons;

      const w1 = data.wilayah.find((w) => w.kode === 'W1');
      expect(w1?.statusWilayah).toBe('TERVERIFIKASI');

      const slotUtama = w1?.slot.find((s) => s.kode === 'W1-UTAMA');
      expect(slotUtama?.status).toBe('TERVERIFIKASI');
      expect(slotUtama?.penerimaAktif).toBe(true);
      expect(slotUtama?.version).toBe(2);

      // Riwayat status pemenang
      expect(slotUtama?.riwayat).toHaveLength(1);
      expect(slotUtama?.riwayat[0]?.dari).toBe('MENANG');
      expect(slotUtama?.riwayat[0]?.ke).toBe('TERVERIFIKASI');

      // Cek di DB log audit
      const auditLog = await getDb().auditLog.findFirst({
        where: { aksi: 'PEMENANG_VERIFIKASI' },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.targetTipe).toBe('slot_hasil');
    });

    it('menolak verifikasi jika versi basi (409 CONFLICT)', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await verifikasiPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/verifikasi`, {
          json: { version: 99 },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(respons.status).toBe(409);
      const json = (await respons.json()) as { error: { code: string } };
      expect(json.error.code).toBe('CONFLICT');
    });

    it('menolak verifikasi pada slot cadangan yang bukan penerima aktif (400)', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await verifikasiPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-C1/verifikasi`, {
          json: { version: 1 },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-C1'),
      );

      expect(respons.status).toBe(400);
      const json = (await respons.json()) as { error: { code: string } };
      expect(json.error.code).toBe('AKSI_TIDAK_VALID');
    });

    it('mengubah status periode menjadi FINAL saat kedua wilayah memiliki penerima Terverifikasi', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      // Verifikasi W1-UTAMA
      await verifikasiPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/verifikasi`, {
          json: { version: 1 },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      // Verifikasi W2-UTAMA
      const resW2 = await verifikasiPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W2-UTAMA/verifikasi`, {
          json: { version: 1 },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W2-UTAMA'),
      );

      expect(resW2.status).toBe(200);

      const periodeUpdate = await getDb().periode.findUniqueOrThrow({
        where: { id: periode.id },
      });
      expect(periodeUpdate.status).toBe('FINAL');
    });
  });

  describe('POST /api/periode/:id/pemenang/:slot/gugur', () => {
    it('memvalidasi alasan wajib dan catatan minimal 5 karakter', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const resPendek = await gugurPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/gugur`, {
          json: { version: 1, alasan: 'TIDAK_DAPAT_DIHUBUNGI', catatan: 'abc' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(resPendek.status).toBe(400);

      const resAlasanSalah = await gugurPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/gugur`, {
          json: { version: 1, alasan: 'ALASAN_SALAH', catatan: 'Catatan cukup panjang' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(resAlasanSalah.status).toBe(400);
    });

    it('menandai penerima utama gugur -> cadangan 1 otomatis naik menjadi penerima aktif', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await gugurPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/gugur`, {
          json: {
            version: 1,
            alasan: 'TIDAK_DAPAT_DIHUBUNGI',
            catatan: 'Dihubungi 3x dalam 3 hari tidak merespons.',
          },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(respons.status).toBe(200);
      const data = (await respons.json()) as PemenangPeriodeRespons;

      const w1 = data.wilayah.find((w) => w.kode === 'W1');
      const utama = w1?.slot.find((s) => s.kode === 'W1-UTAMA');
      const c1 = w1?.slot.find((s) => s.kode === 'W1-C1');
      const c2 = w1?.slot.find((s) => s.kode === 'W1-C2');

      expect(utama?.status).toBe('GUGUR');
      expect(utama?.penerimaAktif).toBe(false);
      expect(utama?.alasanGugur).toBe('TIDAK_DAPAT_DIHUBUNGI');

      expect(c1?.status).toBe('MENANG');
      expect(c1?.penerimaAktif).toBe(true);

      expect(c2?.status).toBe('CADANGAN');
      expect(c2?.penerimaAktif).toBe(false);

      // Cek audit log
      const logGugur = await getDb().auditLog.findFirst({
        where: { aksi: 'PEMENANG_GUGUR' },
      });
      expect(logGugur).not.toBeNull();
    });

    it('bila ketiga kandidat gugur, wilayah berstatus PERLU_KEPUTUSAN', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      // 1. Utama gugur (version 1)
      await gugurPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/gugur`, {
          json: { version: 1, alasan: 'TIDAK_DAPAT_DIHUBUNGI', catatan: 'Catatan valid 1' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      // C1 sekarang version 2 (karena dipromosikan)
      // 2. C1 gugur (version 2)
      await gugurPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-C1/gugur`, {
          json: { version: 2, alasan: 'MENGUNDURKAN_DIRI', catatan: 'Catatan valid 2' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-C1'),
      );

      // C2 sekarang version 2 (karena dipromosikan)
      // 3. C2 gugur (version 2)
      const resC2 = await gugurPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-C2/gugur`, {
          json: { version: 2, alasan: 'DATA_TIDAK_VALID', catatan: 'Catatan valid 3' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-C2'),
      );

      expect(resC2.status).toBe(200);
      const data = (await resC2.json()) as PemenangPeriodeRespons;
      const w1 = data.wilayah.find((w) => w.kode === 'W1');

      expect(w1?.statusWilayah).toBe('PERLU_KEPUTUSAN');
      expect(w1?.slot.every((s) => s.status === 'GUGUR' && !s.penerimaAktif)).toBe(true);
    });

    it('menolak penandaan gugur kedua kali pada slot yang sudah gugur (400)', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      await gugurPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/gugur`, {
          json: { version: 1, alasan: 'TIDAK_DAPAT_DIHUBUNGI', catatan: 'Catatan valid' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      // Coba gugurkan lagi
      const resLagi = await gugurPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/gugur`, {
          json: { version: 2, alasan: 'MENGUNDURKAN_DIRI', catatan: 'Catatan lagi' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(resLagi.status).toBe(400);
    });
  });

  describe('POST /api/periode/:id/pemenang/:slot/nik', () => {
    it('mengembalikan NIK didekripsi dengan alasan wajib, Cache-Control: no-store, dan log audit', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await nikPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/nik`, {
          json: { alasan: 'Verifikasi identitas pemenang di kantor Bapenda' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(respons.status).toBe(200);
      expect(respons.headers.get('cache-control')).toBe('no-store');

      const data = (await respons.json()) as { nik: string };
      expect(data.nik).toBe('1609012345670001');

      // Audit log tercatat PEMENANG_LIHAT_NIK
      const logNik = await getDb().auditLog.findFirst({
        where: { aksi: 'PEMENANG_LIHAT_NIK' },
      });
      expect(logNik).not.toBeNull();
      expect(logNik?.targetTipe).toBe('slot_hasil');

      // NIK asli TIDAK BOLEH ada di payload audit
      const payloadStr = JSON.stringify(logNik?.payload);
      expect(payloadStr).not.toContain(data.nik);
      expect(payloadStr).toContain('Verifikasi identitas');
    });

    it('menolak jika alasan kurang dari 5 karakter (400)', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await nikPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/nik`, {
          json: { alasan: 'pend' },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(respons.status).toBe(400);
    });

    it('menolak akses Operator dengan 403', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const respons = await nikPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/nik`, {
          json: { alasan: 'Verifikasi identitas pemenang' },
          cookie: cookieOperator,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(respons.status).toBe(403);
    });
  });

  describe('Foto Dokumentasi Penyerahan Simbolis Pemenang', () => {
    const FOTO_WEBP_VALID = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';

    it('mengunggah foto bukti penyerahan simbolis dan mencatat audit log', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const res = await fotoPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/foto`, {
          json: {
            fileBase64: FOTO_WEBP_VALID,
            nama: 'penyerahan-simbolis-bupati.webp',
            catatan: 'Diserahkan langsung oleh Bupati OKU Selatan di panggung utama',
          },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        sukses: boolean;
        fotoId: string;
        fotoDokumentasi: string[];
        diserahkanAt: string | null;
        diserahkanCatatan: string | null;
      };

      expect(json.sukses).toBe(true);
      expect(json.fotoDokumentasi.length).toBe(1);
      expect(json.diserahkanCatatan).toBe(
        'Diserahkan langsung oleh Bupati OKU Selatan di panggung utama',
      );
      expect(json.diserahkanAt).not.toBeNull();

      // Cek di GET pemenang periode
      const resGet = await pemenangGet(
        buatRequest(`/api/periode/${periode.id}/pemenang`, {
          cookie: cookieAdmin,
        }),
        paramsId(periode.id),
      );
      const dataPemenang = (await resGet.json()) as PemenangPeriodeRespons;
      const slotW1 = dataPemenang.wilayah[0]?.slot.find((s) => s.kode === 'W1-UTAMA');
      expect(slotW1?.fotoDokumentasi?.length).toBe(1);
      expect(slotW1?.diserahkanCatatan).toBe(
        'Diserahkan langsung oleh Bupati OKU Selatan di panggung utama',
      );

      // Audit log tercatat
      const log = await getDb().auditLog.findFirst({
        where: { aksi: 'PEMENANG_DOKUMENTASI_SIMBOLIS' },
      });
      expect(log).not.toBeNull();
    });

    it('menolak unggahan jika melebihi batas 3 foto (400 VALIDASI_GAGAL)', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      // Unggah 3 foto
      for (let i = 1; i <= 3; i++) {
        const r = await fotoPost(
          buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/foto`, {
            json: {
              fileBase64: FOTO_WEBP_VALID,
              nama: `foto-${i.toString()}.webp`,
            },
            cookie: cookieAdmin,
          }),
          paramsSlot(periode.id, 'W1-UTAMA'),
        );
        expect(r.status).toBe(200);
      }

      // Unggah foto ke-4 harus ditolak
      const r4 = await fotoPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/foto`, {
          json: {
            fileBase64: FOTO_WEBP_VALID,
            nama: 'foto-4.webp',
          },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(r4.status).toBe(400);
      const err = (await r4.json()) as { error?: { message?: string } };
      expect(err.error?.message).toContain('Maksimal 3 foto');
    });

    it('memperbarui catatan penyerahan simbolis via PATCH', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const res = await fotoPatch(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/foto`, {
          json: {
            catatan: 'Catatan hasil koreksi berita acara penyerahan',
          },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as { sukses: boolean; diserahkanCatatan: string };
      expect(json.sukses).toBe(true);
      expect(json.diserahkanCatatan).toBe('Catatan hasil koreksi berita acara penyerahan');
    });

    it('menghapus foto penyerahan simbolis via DELETE dan mencatat audit log', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const resUpload = await fotoPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/foto`, {
          json: {
            fileBase64: FOTO_WEBP_VALID,
            nama: 'foto-hapus.webp',
          },
          cookie: cookieAdmin,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );
      const uploadJson = (await resUpload.json()) as { fotoId: string };

      const resDelete = await fotoDelete(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/foto/${uploadJson.fotoId}`, {
          method: 'DELETE',
          cookie: cookieAdmin,
        }),
        {
          params: Promise.resolve({ id: periode.id, slot: 'W1-UTAMA', fotoId: uploadJson.fotoId }),
        },
      );

      expect(resDelete.status).toBe(200);
      const deleteJson = (await resDelete.json()) as {
        sukses: boolean;
        fotoDokumentasi: string[];
      };
      expect(deleteJson.sukses).toBe(true);
      expect(deleteJson.fotoDokumentasi.length).toBe(0);

      // Audit log PEMENANG_HAPUS_FOTO
      const logHapus = await getDb().auditLog.findFirst({
        where: { aksi: 'PEMENANG_HAPUS_FOTO' },
      });
      expect(logHapus).not.toBeNull();
    });

    it('menolak akses Operator dengan 403', async () => {
      const { periode } = await siapkanPeriodeDiundi();

      const res = await fotoPost(
        buatRequest(`/api/periode/${periode.id}/pemenang/W1-UTAMA/foto`, {
          json: {
            fileBase64: FOTO_WEBP_VALID,
            nama: 'foto-operator.webp',
          },
          cookie: cookieOperator,
        }),
        paramsSlot(periode.id, 'W1-UTAMA'),
      );

      expect(res.status).toBe(403);
    });
  });
});
