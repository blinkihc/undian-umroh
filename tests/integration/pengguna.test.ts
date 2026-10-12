import { randomBytes } from 'node:crypto';

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { PATCH } from '@/app/api/pengguna/[id]/route';
import { GET, POST } from '@/app/api/pengguna/route';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { buatRequest, masuk } from './helpers/aplikasi';
import { auditUntuk, buatPengguna, type PenggunaTes } from './helpers/pengguna';

const PASSWORD_AWAL = 'kata-sandi-awal-2026';
const PASSWORD_RESET = 'kata-sandi-reset-2026';

type IsiGalat = {
  error: { code: string; message: string; details?: Record<string, unknown> };
};

type Akun = { id: string; username: string; aktif: boolean; peran: string; version: number };

async function cookieMasuk(pengguna: PenggunaTes): Promise<string> {
  const { cookie } = await masuk(pengguna.username, pengguna.password);
  if (cookie === null) throw new Error('Login uji gagal.');
  return cookie;
}

async function adminBaru(): Promise<{ admin: PenggunaTes; cookie: string }> {
  const admin = await buatPengguna({ peran: 'ADMIN' });
  return { admin, cookie: await cookieMasuk(admin) };
}

function usernameUnik(awalan = 'op'): string {
  return `${awalan}-${randomBytes(5).toString('hex')}`;
}

async function buatLewatApi(cookie: string, isi: Record<string, unknown>): Promise<Response> {
  return POST(buatRequest('/api/pengguna', { json: isi, cookie }));
}

async function ubahLewatApi(cookie: string, id: string, isi: unknown): Promise<Response> {
  return PATCH(buatRequest(`/api/pengguna/${id}`, { method: 'PATCH', json: isi, cookie }), {
    params: Promise.resolve({ id }),
  });
}

async function versi(id: string): Promise<number> {
  return (await getDb().pengguna.findUniqueOrThrow({ where: { id } })).version;
}

/**
 * Menonaktifkan semua Admin aktif lain agar aturan "Admin terakhir" dapat diuji. Tes integrasi
 * berbagi satu database dan tidak menghapus akun (audit menunjuk ke akun).
 */
async function sisakanSatuAdmin(idAdmin: string): Promise<void> {
  await getDb().pengguna.updateMany({
    where: { peran: 'ADMIN', aktif: true, id: { not: idAdmin } },
    data: { aktif: false },
  });
}

beforeEach(() => {
  getLimiterGagal('login').resetSemua();
  getLimiterGagal('ganti-password').resetSemua();
});

afterAll(async () => {
  await tutupDb();
});

describe('POST /api/pengguna', () => {
  it('Admin membuat akun Operator yang wajib ganti kata sandi dan tercatat di audit', async () => {
    const { admin, cookie } = await adminBaru();
    const username = usernameUnik();

    const respons = await buatLewatApi(cookie, {
      username: `  ${username.toUpperCase()} `,
      nama: 'Operator Satu',
      peran: 'OPERATOR',
      passwordAwal: PASSWORD_AWAL,
    });

    expect(respons.status).toBe(201);
    const isi = (await respons.json()) as Akun & Record<string, unknown>;
    expect(isi).toMatchObject({
      username,
      nama: 'Operator Satu',
      peran: 'OPERATOR',
      aktif: true,
      mustChangePassword: true,
      lastLoginAt: null,
      version: 1,
    });
    expect(isi).not.toHaveProperty('passwordHash');
    expect(isi.createdAt).toMatch(/\+07:00$/);

    const login = await masuk(username, PASSWORD_AWAL);
    expect(login.galat).toBeNull();
    const [baris] = await auditUntuk({ targetId: isi.id, aksi: 'PENGGUNA_BUAT' });
    expect(baris).toMatchObject({
      aktorLabel: admin.username,
      aktorId: admin.id,
      payload: { username, nama: 'Operator Satu', peran: 'OPERATOR' },
    });
    expect(JSON.stringify(baris?.payload)).not.toContain(PASSWORD_AWAL);
  });

  it.each([
    ['username berspasi', { username: 'operator satu' }, 'username'],
    ['username 2 karakter', { username: 'ab' }, 'username'],
    ['username 33 karakter', { username: 'a'.repeat(33) }, 'username'],
    ['kata sandi awal 11 karakter', { passwordAwal: 'x'.repeat(11) }, 'passwordAwal'],
    ['peran tak dikenal', { peran: 'SUPERADMIN' }, 'peran'],
    ['nama kosong', { nama: ' ' }, 'nama'],
  ])('menolak %s dengan 400 dan pesan per field', async (_nama, timpa, field) => {
    const { cookie } = await adminBaru();

    const respons = await buatLewatApi(cookie, {
      username: usernameUnik(),
      nama: 'Uji',
      peran: 'OPERATOR',
      passwordAwal: PASSWORD_AWAL,
      ...timpa,
    });

    expect(respons.status).toBe(400);
    const isi = (await respons.json()) as IsiGalat;
    expect(isi.error.code).toBe('VALIDASI_GAGAL');
    expect(Object.keys(isi.error.details?.fields as object)).toEqual([field]);
  });

  it('menolak kata sandi awal yang sama dengan username', async () => {
    const { cookie } = await adminBaru();
    const username = usernameUnik('operator-panjang');

    const respons = await buatLewatApi(cookie, {
      username,
      nama: 'Uji',
      peran: 'OPERATOR',
      passwordAwal: username,
    });

    expect(respons.status).toBe(400);
    expect(((await respons.json()) as IsiGalat).error.details).toEqual({
      fields: { passwordAwal: 'Kata sandi tidak boleh sama dengan username.' },
    });
  });

  it('menolak username yang sudah dipakai dengan 409 tanpa membuat akun kedua', async () => {
    const { cookie } = await adminBaru();
    const lama = await buatPengguna({ peran: 'OPERATOR' });

    const respons = await buatLewatApi(cookie, {
      username: lama.username,
      nama: 'Ganda',
      peran: 'OPERATOR',
      passwordAwal: PASSWORD_AWAL,
    });

    expect(respons.status).toBe(409);
    const isi = (await respons.json()) as IsiGalat;
    expect(isi.error.code).toBe('USERNAME_SUDAH_DIPAKAI');
    expect(isi.error.details).toEqual({
      fields: { username: 'Username sudah dipakai. Pilih username lain.' },
    });
    expect(await getDb().pengguna.count({ where: { username: lama.username } })).toBe(1);
  });
});

describe('GET /api/pengguna', () => {
  it('mengembalikan semua akun tanpa hash kata sandi', async () => {
    const { cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR' });

    const respons = await GET(buatRequest('/api/pengguna', { cookie }));

    expect(respons.status).toBe(200);
    expect(respons.headers.get('Cache-Control')).toBe('no-store');
    const { items } = (await respons.json()) as { items: (Akun & Record<string, unknown>)[] };
    const akun = items.find((p) => p.id === operator.id);
    expect(akun).toMatchObject({ username: operator.username, peran: 'OPERATOR', aktif: true });
    expect(JSON.stringify(items)).not.toContain('argon2');
  });
});

describe('PATCH /api/pengguna/:id', () => {
  it('menonaktifkan Operator: login berikutnya gagal, sesi lamanya terputus, audit tercatat', async () => {
    const { admin, cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR' });
    const cookieOperator = await cookieMasuk(operator);

    const respons = await ubahLewatApi(cookie, operator.id, { version: 1, aktif: false });

    expect(respons.status).toBe(200);
    expect(await respons.json()).toMatchObject({ aktif: false, version: 2 });
    expect((await masuk(operator.username, operator.password)).galat).not.toBeNull();
    const sesiLama = await GET(buatRequest('/api/pengguna', { cookie: cookieOperator }));
    expect(sesiLama.status).toBe(401);
    expect(await auditUntuk({ targetId: operator.id, aksi: 'PENGGUNA_NONAKTIFKAN' })).toEqual([
      expect.objectContaining({
        aktorLabel: admin.username,
        payload: { username: operator.username },
      }),
    ]);
  });

  it('mengaktifkan kembali akun nonaktif sehingga dapat login lagi', async () => {
    const { cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR', aktif: false });

    const respons = await ubahLewatApi(cookie, operator.id, { version: 1, aktif: true });

    expect(await respons.json()).toMatchObject({ aktif: true });
    expect((await masuk(operator.username, operator.password)).galat).toBeNull();
    expect(await auditUntuk({ targetId: operator.id, aksi: 'PENGGUNA_AKTIFKAN' })).toHaveLength(1);
  });

  it('reset kata sandi: kata sandi lama tidak berlaku, wajib ganti, tanpa kata sandi di audit', async () => {
    const { cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR' });

    const respons = await ubahLewatApi(cookie, operator.id, {
      version: 1,
      resetPassword: PASSWORD_RESET,
    });

    expect(await respons.json()).toMatchObject({ mustChangePassword: true, version: 2 });
    expect((await masuk(operator.username, operator.password)).galat).not.toBeNull();
    const baru = await masuk(operator.username, PASSWORD_RESET);
    expect(baru.galat).toBeNull();
    // Sesi dari kata sandi reset hanya boleh mengganti kata sandi.
    const lain = await GET(buatRequest('/api/pengguna', { cookie: baru.cookie }));
    expect(lain.status).toBe(403);
    const audit = await auditUntuk({ targetId: operator.id, aksi: 'PENGGUNA_RESET_PASSWORD' });
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit)).not.toContain(PASSWORD_RESET);
  });

  it('menolak kata sandi reset yang terlalu pendek tanpa mengubah akun', async () => {
    const { cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR' });

    const respons = await ubahLewatApi(cookie, operator.id, {
      version: 1,
      resetPassword: 'pendek',
    });

    expect(respons.status).toBe(400);
    expect(await versi(operator.id)).toBe(1);
  });

  it('mengubah peran Operator menjadi Admin dan mencatat peran lama dan baru', async () => {
    const { cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR' });

    const respons = await ubahLewatApi(cookie, operator.id, { version: 1, peran: 'ADMIN' });

    expect(await respons.json()).toMatchObject({ peran: 'ADMIN' });
    expect(await auditUntuk({ targetId: operator.id, aksi: 'PENGGUNA_UBAH' })).toEqual([
      expect.objectContaining({
        payload: { username: operator.username, peranLama: 'OPERATOR', peranBaru: 'ADMIN' },
      }),
    ]);
  });

  it('menolak Admin menonaktifkan atau menurunkan perannya sendiri dengan 422', async () => {
    const { admin, cookie } = await adminBaru();

    for (const perubahan of [{ aktif: false }, { peran: 'OPERATOR' }]) {
      const respons = await ubahLewatApi(cookie, admin.id, { version: 1, ...perubahan });

      expect(respons.status).toBe(422);
      expect(((await respons.json()) as IsiGalat).error).toMatchObject({
        code: 'PERUBAHAN_AKUN_DITOLAK',
        message: 'Anda tidak dapat menonaktifkan atau menurunkan peran akun Anda sendiri.',
        details: { alasan: 'UBAH_DIRI_SENDIRI' },
      });
    }
    const baris = await getDb().pengguna.findUniqueOrThrow({ where: { id: admin.id } });
    expect(baris).toMatchObject({ aktif: true, peran: 'ADMIN', version: 1 });
  });

  it('mengizinkan menonaktifkan dan menurunkan Admin lain selama masih ada Admin aktif', async () => {
    const { admin: pelaku, cookie } = await adminBaru();
    const target = await buatPengguna({ peran: 'ADMIN' });
    const lain = await buatPengguna({ peran: 'ADMIN' });
    // Tepat tiga Admin aktif: pelaku, target, lain.
    await sisakanSatuAdmin(pelaku.id);
    await getDb().pengguna.updateMany({
      where: { id: { in: [target.id, lain.id] } },
      data: { aktif: true },
    });

    const nonaktif = await ubahLewatApi(cookie, target.id, {
      version: await versi(target.id),
      aktif: false,
    });
    const turun = await ubahLewatApi(cookie, lain.id, {
      version: await versi(lain.id),
      peran: 'OPERATOR',
    });

    expect([nonaktif.status, turun.status]).toEqual([200, 200]);
    // Tinggal pelaku: menonaktifkan dirinya sendiri tetap ditolak, jadi selalu ada Admin aktif.
    const diri = await ubahLewatApi(cookie, pelaku.id, { version: 1, aktif: false });
    expect(diri.status).toBe(422);
    expect(await getDb().pengguna.count({ where: { peran: 'ADMIN', aktif: true } })).toBe(1);
  });

  it('menolak menonaktifkan Admin aktif terakhir saat dua Admin saling menonaktifkan bersamaan', async () => {
    const a = await buatPengguna({ peran: 'ADMIN' });
    const b = await buatPengguna({ peran: 'ADMIN' });
    await sisakanSatuAdmin(a.id);
    await getDb().pengguna.update({ where: { id: b.id }, data: { aktif: true } });
    const [cookieA, cookieB] = await Promise.all([cookieMasuk(a), cookieMasuk(b)]);

    const hasil = await Promise.all([
      ubahLewatApi(cookieA, b.id, { version: await versi(b.id), aktif: false }),
      ubahLewatApi(cookieB, a.id, { version: await versi(a.id), aktif: false }),
    ]);

    const status = hasil.map((r) => r.status).sort();
    // Satu berhasil; yang kedua ditolak sebagai Admin terakhir (422), atau sesi pelakunya sudah
    // terputus (401) bila akunnya lebih dulu dinonaktifkan sebelum pemeriksaan sesi.
    expect(status[0]).toBe(200);
    expect([401, 422]).toContain(status[1]);
    const ditolak = hasil.find((r) => r.status === 422);
    if (ditolak !== undefined) {
      expect(((await ditolak.json()) as IsiGalat).error).toMatchObject({
        code: 'PERUBAHAN_AKUN_DITOLAK',
        message: 'Minimal satu Admin aktif harus tersisa.',
        details: { alasan: 'ADMIN_TERAKHIR' },
      });
    }
    expect(await getDb().pengguna.count({ where: { peran: 'ADMIN', aktif: true } })).toBe(1);
  });

  it('menolak version basi dengan 409 tanpa mengubah akun', async () => {
    const { cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR' });
    await ubahLewatApi(cookie, operator.id, { version: 1, aktif: false });

    const respons = await ubahLewatApi(cookie, operator.id, { version: 1, aktif: true });

    expect(respons.status).toBe(409);
    expect(((await respons.json()) as IsiGalat).error.code).toBe('CONFLICT');
    const baris = await getDb().pengguna.findUniqueOrThrow({ where: { id: operator.id } });
    expect(baris).toMatchObject({ aktif: false, version: 2 });
  });

  it('perubahan tanpa efek tidak menaikkan version dan tidak menulis audit', async () => {
    const { cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR' });

    const respons = await ubahLewatApi(cookie, operator.id, { version: 1, aktif: true });

    expect(await respons.json()).toMatchObject({ aktif: true, version: 1 });
    expect(await auditUntuk({ targetId: operator.id })).toEqual([]);
  });

  it('menjawab 404 untuk akun yang tidak ada dan 400 untuk dua perubahan sekaligus', async () => {
    const { cookie } = await adminBaru();
    const operator = await buatPengguna({ peran: 'OPERATOR' });

    const tidakAda = await ubahLewatApi(cookie, 'tidak-ada', { version: 1, aktif: false });
    const ganda = await ubahLewatApi(cookie, operator.id, {
      version: 1,
      aktif: false,
      peran: 'ADMIN',
    });

    expect(tidakAda.status).toBe(404);
    expect(ganda.status).toBe(400);
  });
});

describe('hak akses endpoint pengguna', () => {
  it('Operator ditolak 403 dan tanpa sesi 401 di semua endpoint pengguna', async () => {
    const operator = await buatPengguna({ peran: 'OPERATOR' });
    const cookie = await cookieMasuk(operator);
    const isiBuat = {
      username: usernameUnik(),
      nama: 'X',
      peran: 'ADMIN',
      passwordAwal: PASSWORD_AWAL,
    };

    const respons = [
      await GET(buatRequest('/api/pengguna', { cookie })),
      await buatLewatApi(cookie, isiBuat),
      await ubahLewatApi(cookie, operator.id, { version: 1, peran: 'ADMIN' }),
    ];
    const tanpaSesi = [
      await GET(buatRequest('/api/pengguna')),
      await POST(buatRequest('/api/pengguna', { json: isiBuat })),
      await PATCH(
        buatRequest(`/api/pengguna/${operator.id}`, {
          method: 'PATCH',
          json: { version: 1, aktif: true },
        }),
        { params: Promise.resolve({ id: operator.id }) },
      ),
    ];

    expect(respons.map((r) => r.status)).toEqual([403, 403, 403]);
    expect(tanpaSesi.map((r) => r.status)).toEqual([401, 401, 401]);
    const baris = await getDb().pengguna.findUniqueOrThrow({ where: { id: operator.id } });
    expect(baris.peran).toBe('OPERATOR');
    expect(await getDb().pengguna.count({ where: { username: isiBuat.username } })).toBe(0);
  });
});
