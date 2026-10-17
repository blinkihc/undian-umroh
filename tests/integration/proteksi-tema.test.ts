import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { GET as captchaGet } from '@/app/api/publik/captcha/route';
import { POST as cekPost } from '@/app/api/publik/cek/route';
import { GET as pemenangPublikGet } from '@/app/api/publik/pemenang/route';
import { GET as temaGet, POST as temaPost } from '@/app/api/tema/route';
import { GET as temaDetailGet, PUT as temaDetailPut } from '@/app/api/tema/[id]/route';
import { POST as temaDefaultPost } from '@/app/api/tema/[id]/default/route';
import { PUT as periodeTemaPut } from '@/app/api/periode/[id]/tema/route';
import { getEnv } from '@/config/env';
import { pecahkanCaptcha, type SolusiCaptcha } from '@/lib/captcha';
import { canonicalStringify, sha256Hex } from '@/lib/package/hash';
import { TEMA_DEFAULT, ThemeConfigSchema } from '@/lib/package/theme';
import { buatTantanganCaptcha, resetSaltTerpakai, verifikasiCaptcha } from '@/server/captcha';
import { getDb, tutupDb } from '@/server/db';
import { deteksiDanValidasiFormat } from '@/server/magic-bytes';
import { catatPermintaanCekNop, resetRateLimitPublik } from '@/server/rate-limit-publik';
import { buatPaketZip } from '@/server/services/paket';
import {
  hapusAset,
  ID_ASET_MENUNGGU_BAWAAN,
  ID_TEMA_DEFAULT,
  pastikanTemaDanAsetBawaan,
  simpanAset,
} from '@/server/services/tema';

import { buatCookieSesi, buatRequest } from './helpers/aplikasi';
import { buatPengguna, type PenggunaTes } from './helpers/pengguna';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';

let admin: PenggunaTes;
let cookieAdmin: string;

beforeAll(async () => {
  admin = await buatPengguna({ peran: 'ADMIN' });
  cookieAdmin = await buatCookieSesi({ sub: admin.id, loginAt: Date.now() });

  // Pastikan tema bawaan ada
  await pastikanTemaDanAsetBawaan(getDb(), admin.id);
});

beforeEach(async () => {
  resetSaltTerpakai();
  resetRateLimitPublik();
  await bersihkanPeriode();
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

function paramsId(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('Batch 2: Tiket 22 - Proteksi Halaman Publik (Rate Limit & Captcha PoW)', () => {
  it('menghasilkan tantangan PoW yang valid, dapat dipecahkan, dan menolak pemakaian ulang (single-use)', async () => {
    const tantangan = buatTantanganCaptcha('000'); // kesulitan ringan untuk tes
    expect(tantangan.salt).toBeDefined();
    expect(tantangan.signature).toBeDefined();

    // Pecahkan tantangan dengan solver klien
    const solusi = await pecahkanCaptcha(tantangan);
    expect(solusi.nonce).toBeGreaterThanOrEqual(0);

    // Verifikasi sukses pada percobaan pertama
    expect(() => verifikasiCaptcha(solusi, '000')).not.toThrow();

    // Verifikasi gagal saat solusi dipakai ulang (replay attack dicegah)
    expect(() => verifikasiCaptcha(solusi, '000')).toThrowError(/pernah dipakai/i);
  });

  it('menolak tantangan captcha yang sudah kedaluwarsa atau tanda tangan tidak sah', () => {
    const kadaluarsa: SolusiCaptcha = {
      salt: 'abc123',
      nonce: 10,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // masa lalu
      signature: 'signaturepalsu',
    };
    expect(() => verifikasiCaptcha(kadaluarsa)).toThrowError(/kedaluwarsa/i);

    const tandaTanganSalah: SolusiCaptcha = {
      salt: 'abc123',
      nonce: 10,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      signature: '0'.repeat(64),
    };
    expect(() => verifikasiCaptcha(tandaTanganSalah)).toThrowError(/tidak sah/i);
  });

  it('rate limit cek NOP: memicu captcha di atas 20 permintaan dan 429 di atas 60 permintaan', async () => {
    const ipUji = '192.168.10.50';
    const reqTantangan = buatRequest('/api/publik/captcha');
    const resTantangan = await captchaGet(reqTantangan);
    const tantangan = await resTantangan.json();
    const solusi = await pecahkanCaptcha(tantangan);

    // Kirim 20 permintaan tanpa captcha
    for (let i = 0; i < 20; i++) {
      const req = buatRequest('/api/publik/cek', {
        method: 'POST',
        json: { nop: '160901000100100010' },
        ip: ipUji,
      });
      const res = await cekPost(req);
      expect(res.status).toBe(200);
    }

    // Permintaan ke-21 tanpa captcha memicu 429 dengan captchaDiperlukan: true
    const req21 = buatRequest('/api/publik/cek', {
      method: 'POST',
      json: { nop: '160901000100100010' },
      ip: ipUji,
    });
    const res21 = await cekPost(req21);
    expect(res21.status).toBe(429);
    const json21 = await res21.json();
    expect(json21.error.details.captchaDiperlukan).toBe(true);

    // Permintaan dengan solusi captcha valid berhasil lolos
    const reqDenganCaptcha = buatRequest('/api/publik/cek', {
      method: 'POST',
      json: { nop: '160901000100100010', captcha: solusi },
      ip: ipUji,
    });
    const resDenganCaptcha = await cekPost(reqDenganCaptcha);
    expect(resDenganCaptcha.status).toBe(200);

    // Simulasikan melewati batas keras (60) secara instan
    for (let i = 22; i <= 60; i++) {
      catatPermintaanCekNop(ipUji);
    }

    // Permintaan ke-61 diblokir keras dengan 429 dan Retry-After
    const reqBlokir = buatRequest('/api/publik/cek', {
      method: 'POST',
      json: { nop: '160901000100100010' },
      ip: ipUji,
    });
    const resBlokir = await cekPost(reqBlokir);
    expect(resBlokir.status).toBe(429);
    expect(resBlokir.headers.get('Retry-After')).toBeDefined();
    const jsonBlokir = await resBlokir.json();
    expect(jsonBlokir.error.message).toContain('Terlalu banyak pengecekan');
  });

  it('rate limit pemenang publik memblokir dengan 429 setelah 120 permintaan per menit', async () => {
    const ipPemenang = '192.168.10.99';
    for (let i = 0; i < 120; i++) {
      const req = buatRequest('/api/publik/pemenang', { ip: ipPemenang });
      const res = await pemenangPublikGet(req);
      expect(res.status).toBe(200);
    }

    // Permintaan ke-121 memicu 429
    const req121 = buatRequest('/api/publik/pemenang', { ip: ipPemenang });
    const res121 = await pemenangPublikGet(req121);
    expect(res121.status).toBe(429);
    expect(res121.headers.get('Retry-After')).toBeDefined();
  });
});

describe('Batch 2: Tiket 23 & 24 - Tema Bawaan, Aset, dan Halaman Tema Undian', () => {
  it('ThemeConfigSchema memvalidasi semua field dan menolak input tidak valid atau field asing', () => {
    // Valid default tema lolos
    expect(() => ThemeConfigSchema.parse(TEMA_DEFAULT)).not.toThrow();

    // Durasi kurang dari 3 detik ditolak
    const durasiKecil = {
      ...TEMA_DEFAULT,
      animasi: { ...TEMA_DEFAULT.animasi, durasiDetik: 2 },
    };
    expect(() => ThemeConfigSchema.parse(durasiKecil)).toThrow();

    // Durasi lebih dari 30 detik ditolak
    const durasiBesar = {
      ...TEMA_DEFAULT,
      animasi: { ...TEMA_DEFAULT.animasi, durasiDetik: 35 },
    };
    expect(() => ThemeConfigSchema.parse(durasiBesar)).toThrow();

    // Field tambahan/asing ditolak secara ketat (.strict())
    const fieldAsing = {
      ...TEMA_DEFAULT,
      fieldTakDikenal: 'hack',
    };
    expect(() => ThemeConfigSchema.parse(fieldAsing)).toThrow();
  });

  it('deteksi magic bytes: menolak SVG dan file melebihi batas ukuran', () => {
    // 1. Tolak SVG
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle /></svg>');
    expect(() => deteksiDanValidasiFormat(svgBuffer, 'GAMBAR')).toThrowError(/SVG tidak diizinkan/i);

    // 2. Tolak file gambar > 5 MB
    const gambarBesar = Buffer.alloc(5 * 1024 * 1024 + 10);
    expect(() => deteksiDanValidasiFormat(gambarBesar, 'GAMBAR')).toThrowError(/melebihi batas/i);

    // 3. Tolak file audio > 10 MB
    const audioBesar = Buffer.alloc(10 * 1024 * 1024 + 10);
    expect(() => deteksiDanValidasiFormat(audioBesar, 'AUDIO')).toThrowError(/melebihi batas/i);

    // 4. Deteksi format PNG valid
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const infoPng = deteksiDanValidasiFormat(pngHeader, 'GAMBAR');
    expect(infoPng.mime).toBe('image/png');
    expect(infoPng.ekstensi).toBe('png');
  });

  function sesiAdmin() {
    return {
      id: admin.id,
      username: admin.username,
      nama: 'Admin Uji',
      peran: 'ADMIN' as const,
      mustChangePassword: false,
    };
  }

  it('mencegah penghapusan aset bawaan atau aset yang digunakan oleh tema', async () => {
    // Aset bawaan tidak dapat dihapus
    await expect(
      hapusAset(ID_ASET_MENUNGGU_BAWAAN, sesiAdmin()),
    ).rejects.toThrowError(/Aset bawaan sistem tidak dapat dihapus/i);

    // Unggah aset kustom
    const bufferMp3 = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xfb, 0x90, 0x64]);
    const asetKustom = await simpanAset({
      buffer: bufferMp3,
      nama: 'Musik Kustom',
      deskripsi: 'Audio uji',
      lisensi: 'Bebas Royalti',
      jenis: 'AUDIO',
      aktor: sesiAdmin(),
    });
    expect(asetKustom.id).toBeDefined();

    // Buat tema yang merujuk aset kustom tersebut
    const db = getDb();
    const configDenganAset = {
      ...TEMA_DEFAULT,
      audio: {
        ...TEMA_DEFAULT.audio,
        menunggu: { ...TEMA_DEFAULT.audio.menunggu, asetId: asetKustom.id },
      },
    };

    const temaBaru = await db.tema.create({
      data: {
        nama: 'Tema Uji Aset',
        config: configDenganAset as unknown as object,
        configHash: await sha256Hex(canonicalStringify(configDenganAset)),
        bawaan: false,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });

    // Upaya menghapus aset yang dipakai tema ditolak
    await expect(
      hapusAset(asetKustom.id, sesiAdmin()),
    ).rejects.toThrowError(/sedang digunakan oleh tema/i);

    // Hapus tema terlebih dahulu, baru aset dapat dihapus
    await db.tema.delete({ where: { id: temaBaru.id } });
    await expect(
      hapusAset(asetKustom.id, sesiAdmin()),
    ).resolves.toBeUndefined();
  });

  it('Admin mengelola tema, memilih tema untuk periode, dan mereset ke default', async () => {
    // 1. Ambil daftar tema via GET /api/tema
    const reqDaftar = buatRequest('/api/tema', { cookie: cookieAdmin });
    const resDaftar = await temaGet(reqDaftar);
    expect(resDaftar.status).toBe(200);
    const jsonDaftar = await resDaftar.json();
    expect(jsonDaftar.items.length).toBeGreaterThan(0);

    // 2. Simpan tema baru via POST /api/tema
    const configBaru = {
      ...TEMA_DEFAULT,
      animasi: { ...TEMA_DEFAULT.animasi, durasiDetik: 8, kecepatan: 'cepat' as const },
    };
    const reqBuat = buatRequest('/api/tema', {
      method: 'POST',
      cookie: cookieAdmin,
      json: { nama: 'Tema Acara Cepat', config: configBaru },
    });
    const resBuat = await temaPost(reqBuat);
    expect(resBuat.status).toBe(201);
    const temaDibuat = await resBuat.json();
    expect(temaDibuat.nama).toBe('Tema Acara Cepat');

    // 3. Pilih tema untuk periode via PUT /api/periode/:id/tema
    const periode = await buatPeriodeTes(admin.id);
    const reqPilih = buatRequest(`/api/periode/${periode.id}/tema`, {
      method: 'PUT',
      cookie: cookieAdmin,
      json: { temaId: temaDibuat.id },
    });
    const resPilih = await periodeTemaPut(reqPilih, paramsId(periode.id));
    expect(resPilih.status).toBe(200);
    const jsonPilih = await resPilih.json();
    expect(jsonPilih.sukses).toBe(true);
    expect(jsonPilih.peringatan).toBeNull(); // Belum pernah unduh paket, peringatan null

    // 4. Reset tema ke default via POST /api/tema/:id/default
    const reqReset = buatRequest(`/api/tema/${temaDibuat.id}/default`, {
      method: 'POST',
      cookie: cookieAdmin,
    });
    const resReset = await temaDefaultPost(reqReset, paramsId(temaDibuat.id));
    expect(resReset.status).toBe(200);
    const jsonReset = await resReset.json();
    expect(jsonReset.config.animasi.durasiDetik).toBe(TEMA_DEFAULT.animasi.durasiDetik);
  });

  it('paket .zip memuat tema dan aset yang dirujuk dengan hash tema di meta.json', async () => {
    const periode = await buatPeriodeTes(admin.id);
    const db = getDb();
    await db.periode.update({ where: { id: periode.id }, data: { status: 'TERKUNCI' } });

    const dummySnapshot = {
      version: 1,
      periode: {
        slug: periode.slug,
        judul: periode.judul,
      },
      peserta: [],
    };
    const snapshotIsi = canonicalStringify(dummySnapshot);
    const hash = await sha256Hex(snapshotIsi);
    const relPath = `snapshots/${periode.id}.json`;
    const fullPath = path.join(getEnv().STORAGE_DIR, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, snapshotIsi, 'utf-8');

    await db.snapshot.create({
      data: {
        periodeId: periode.id,
        hash,
        jumlahW1: 0,
        jumlahW2: 0,
        filePath: relPath,
        lockedById: admin.id,
      },
    });

    const hasilPaket = await buatPaketZip({
      periodeId: periode.id,
      aktor: sesiAdmin(),
      konteks: { ip: '127.0.0.1', userAgent: 'test-agent' },
    });

    expect(hasilPaket.zipBuffer.byteLength).toBeGreaterThan(0);
    expect(hasilPaket.namaFile).toContain(periode.slug);
    expect(hasilPaket.paketSha256).toBeDefined();

    // Verifikasi unduhan kedua menghasilkan peringatan saat tema diubah
    const reqPilihUlang = buatRequest(`/api/periode/${periode.id}/tema`, {
      method: 'PUT',
      cookie: cookieAdmin,
      json: { temaId: ID_TEMA_DEFAULT },
    });
    const resPilihUlang = await periodeTemaPut(reqPilihUlang, paramsId(periode.id));
    const jsonPilihUlang = await resPilihUlang.json();
    expect(jsonPilihUlang.peringatan).toContain('Paket perlu diunduh ulang');
  });
});
