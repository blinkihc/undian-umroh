import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { BATAS_SESI_MUTLAK_MS, MASA_SESI_DETIK } from '@/config/sesi';
import { ambilPenggunaDariHeaders } from '@/server/auth/sesi';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { buatCookieSesi, keluar, masuk } from './helpers/aplikasi';
import { PASSWORD_TES, auditUntuk, buatPengguna } from './helpers/pengguna';

const PESAN_GENERIK = { error: 'CredentialsSignin', code: 'credentials' };

beforeEach(() => {
  getLimiterGagal('login').resetSemua();
});

afterAll(async () => {
  await tutupDb();
});

describe('login', () => {
  it('membuat sesi untuk kredensial benar dan mencatat tepat satu LOGIN_BERHASIL', async () => {
    const admin = await buatPengguna({ peran: 'ADMIN' });

    const hasil = await masuk(admin.username, admin.password, { ip: '203.0.113.10' });

    expect(hasil.galat).toBeNull();
    expect(hasil.cookie).not.toBeNull();
    const pengguna = await ambilPenggunaDariHeaders(new Headers({ cookie: hasil.cookie ?? '' }));
    expect(pengguna).toMatchObject({ id: admin.id, username: admin.username, peran: 'ADMIN' });

    const audit = await auditUntuk({ aktorLabel: admin.username });
    expect(audit.map((baris) => baris.aksi)).toEqual(['LOGIN_BERHASIL']);
    expect(audit[0]).toMatchObject({ aktorId: admin.id, ip: '203.0.113.10' });
    const baris = await getDb().pengguna.findUniqueOrThrow({ where: { id: admin.id } });
    expect(baris.lastLoginAt).not.toBeNull();
  });

  it('menyimpan sesi di cookie httpOnly, Secure, SameSite=Lax yang berlaku 8 jam', async () => {
    const operator = await buatPengguna({ peran: 'OPERATOR' });

    const { setCookieSesi } = await masuk(operator.username, operator.password);

    expect(setCookieSesi).not.toBeNull();
    const atribut = (setCookieSesi ?? '').toLowerCase();
    expect(atribut).toContain('httponly');
    expect(atribut).toContain('secure');
    expect(atribut).toContain('samesite=lax');
    expect(atribut).toContain('path=/');
    const kedaluwarsa = /expires=([^;]+)/.exec(atribut)?.[1];
    const sisaDetik = (new Date(kedaluwarsa ?? '').getTime() - Date.now()) / 1000;
    expect(sisaDetik).toBeGreaterThan(MASA_SESI_DETIK - 60);
    expect(sisaDetik).toBeLessThanOrEqual(MASA_SESI_DETIK + 1);
  });

  it('memberi hasil yang sama untuk kata sandi salah, username tak dikenal, dan akun nonaktif', async () => {
    const aktif = await buatPengguna();
    const nonaktif = await buatPengguna({ aktif: false });

    const salahPassword = await masuk(aktif.username, 'bukan-kata-sandi-yang-benar');
    const tidakDikenal = await masuk('tidak-ada-pengguna-ini', PASSWORD_TES);
    const akunNonaktif = await masuk(nonaktif.username, nonaktif.password);

    for (const hasil of [salahPassword, tidakDikenal, akunNonaktif]) {
      expect(hasil.galat).toEqual(PESAN_GENERIK);
      expect(hasil.cookie).toBeNull();
    }
    const alasan = async (label: string): Promise<unknown> =>
      (await auditUntuk({ aktorLabel: label, aksi: 'LOGIN_GAGAL' })).map((baris) => baris.payload);
    expect(await alasan(aktif.username)).toEqual([{ alasan: 'KREDENSIAL_SALAH' }]);
    expect(await alasan(nonaktif.username)).toEqual([{ alasan: 'AKUN_NONAKTIF' }]);
    expect(await alasan('tidak-ada-pengguna-ini')).toEqual([{ alasan: 'KREDENSIAL_SALAH' }]);
  });

  it('tidak pernah menaruh kata sandi yang diketik ke audit', async () => {
    const pengguna = await buatPengguna();
    const diketik = 'rahasia-salah-ketik-9876';

    await masuk(pengguna.username, diketik);

    const semua = await getDb().auditLog.findMany({ where: { aktorLabel: pengguna.username } });
    expect(
      JSON.stringify(semua, (_k, v: unknown) => (typeof v === 'bigint' ? v.toString() : v)),
    ).not.toContain(diketik);
  });

  it('tidak mencatat teks bebas yang diketik di kolom username sebagai label audit', async () => {
    await masuk('Ini Bukan Username Karena Ada Spasi Dan Kapital', 'apa-saja-12345');

    const baris = await getDb().auditLog.findFirstOrThrow({
      where: { aksi: 'LOGIN_GAGAL', aktorLabel: '(tidak valid)' },
      orderBy: { id: 'desc' },
    });
    expect(baris.aktorLabel).toBe('(tidak valid)');
  });

  it('memblokir login 15 menit setelah 5 kegagalan beruntun, juga untuk kata sandi benar', async () => {
    const pengguna = await buatPengguna();
    const ip = '198.51.100.7';

    for (let i = 0; i < 5; i++) {
      const gagal = await masuk(pengguna.username, `salah-${i.toString()}-aaaaaaaa`, { ip });
      expect(gagal.galat).toEqual(PESAN_GENERIK);
    }
    const diblokir = await masuk(pengguna.username, pengguna.password, { ip });

    expect(diblokir.respons.status).toBe(429);
    expect(diblokir.cookie).toBeNull();
    const isi = (await diblokir.respons.json()) as {
      error: { code: string; message: string; requestId: string };
    };
    expect(isi.error).toMatchObject({
      code: 'TERLALU_BANYAK_PERMINTAAN',
      message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
    });
    expect(isi.error.requestId).toMatch(/^req_/);
    expect(Number(diblokir.respons.headers.get('Retry-After'))).toBeGreaterThan(14 * 60);

    // Kegagalan dan blokir tercatat; percobaan saat diblokir tidak membanjiri audit.
    const aksi = (await auditUntuk({ aktorLabel: pengguna.username })).map((baris) => baris.aksi);
    expect(aksi.filter((nama) => nama === 'LOGIN_GAGAL')).toHaveLength(5);
    expect(aksi.filter((nama) => nama === 'LOGIN_DIBLOKIR')).toHaveLength(1);
    expect(aksi).not.toContain('LOGIN_BERHASIL');
  });

  it('hanya memblokir kombinasi username dan IP yang gagal', async () => {
    const pengguna = await buatPengguna();
    for (let i = 0; i < 5; i++) {
      await masuk(pengguna.username, `salah-${i.toString()}-aaaaaaaa`, { ip: '198.51.100.20' });
    }

    const dariIpLain = await masuk(pengguna.username, pengguna.password, { ip: '198.51.100.21' });

    expect(dariIpLain.galat).toBeNull();
    expect(dariIpLain.cookie).not.toBeNull();
  });

  it('menghapus hitungan gagal setelah login berhasil', async () => {
    const pengguna = await buatPengguna();
    const ip = '198.51.100.30';
    for (let i = 0; i < 4; i++) {
      await masuk(pengguna.username, `salah-${i.toString()}-aaaaaaaa`, { ip });
    }
    expect((await masuk(pengguna.username, pengguna.password, { ip })).galat).toBeNull();

    for (let i = 0; i < 4; i++) {
      const gagal = await masuk(pengguna.username, `salah-lagi-${i.toString()}-aaaa`, { ip });
      expect(gagal.respons.status).toBe(200);
    }
  });
});

describe('sesi', () => {
  it('menolak akun yang dinonaktifkan seketika walau cookie masih berlaku', async () => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);
    const header = new Headers({ cookie: cookie ?? '' });
    expect(await ambilPenggunaDariHeaders(header)).not.toBeNull();

    await getDb().pengguna.update({ where: { id: pengguna.id }, data: { aktif: false } });

    expect(await ambilPenggunaDariHeaders(header)).toBeNull();
  });

  it('menolak sesi yang sudah lewat 12 jam sejak login walau tanda tangannya sah', async () => {
    const pengguna = await buatPengguna();
    const lamaSekali = await buatCookieSesi({
      sub: pengguna.id,
      loginAt: Date.now() - BATAS_SESI_MUTLAK_MS - 60_000,
    });
    const barusan = await buatCookieSesi({ sub: pengguna.id, loginAt: Date.now() - 60_000 });

    expect(await ambilPenggunaDariHeaders(new Headers({ cookie: lamaSekali }))).toBeNull();
    expect(await ambilPenggunaDariHeaders(new Headers({ cookie: barusan }))).not.toBeNull();
  });

  it('menolak cookie yang dirusak atau bertanda tangan kunci lain', async () => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);

    const dirusak = `${cookie ?? ''}x`;

    expect(await ambilPenggunaDariHeaders(new Headers({ cookie: dirusak }))).toBeNull();
    expect(await ambilPenggunaDariHeaders(new Headers())).toBeNull();
  });

  it('mengakhiri sesi saat keluar dan mencatat LOGOUT', async () => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);

    const respons = await keluar(cookie ?? '');

    expect(respons.status).toBe(200);
    const hapus = respons.headers
      .getSetCookie()
      .find((baris) => baris.startsWith('__Secure-authjs.session-token='));
    expect(hapus).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    const aksi = (await auditUntuk({ aktorLabel: pengguna.username })).map((baris) => baris.aksi);
    expect(aksi).toEqual(['LOGIN_BERHASIL', 'LOGOUT']);
  });
});
