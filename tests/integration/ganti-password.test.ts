import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/akun/ganti-password/route';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { buatRequest, masuk } from './helpers/aplikasi';
import { PASSWORD_TES, auditUntuk, buatPengguna } from './helpers/pengguna';

const PASSWORD_BARU = 'kata-sandi-baru-9876';

type IsiGalat = { error: { code: string; details?: { fields?: Record<string, string> } } };

async function kirim(
  cookie: string | null,
  isi: unknown,
): Promise<{ respons: Response; galat: IsiGalat['error'] | null }> {
  const respons = await POST(buatRequest('/api/akun/ganti-password', { json: isi, cookie }));
  const salinan = respons.clone();
  const galat = respons.ok ? null : ((await salinan.json()) as IsiGalat).error;
  return { respons, galat };
}

beforeEach(() => {
  getLimiterGagal('login').resetSemua();
  getLimiterGagal('ganti-password').resetSemua();
});

afterAll(async () => {
  await tutupDb();
});

describe('POST /api/akun/ganti-password', () => {
  it('mengganti kata sandi akun wajib-ganti, melepas kewajiban, dan mencatat tepat satu audit', async () => {
    const baru = await buatPengguna({ mustChangePassword: true });
    const { cookie } = await masuk(baru.username, baru.password);

    const { respons } = await kirim(cookie, {
      passwordLama: baru.password,
      passwordBaru: PASSWORD_BARU,
    });

    expect(respons.status).toBe(200);
    expect(await respons.json()).toEqual({ mustChangePassword: false });
    const baris = await getDb().pengguna.findUniqueOrThrow({ where: { id: baru.id } });
    expect(baris.mustChangePassword).toBe(false);
    expect(baris.passwordHash).toMatch(/^\$argon2id\$/);
    expect((await masuk(baru.username, baru.password)).galat).not.toBeNull();
    expect((await masuk(baru.username, PASSWORD_BARU)).galat).toBeNull();
    const aksi = (await auditUntuk({ aktorLabel: baru.username, aksi: 'PASSWORD_GANTI' })).length;
    expect(aksi).toBe(1);
  });

  it('menolak tanpa sesi dengan 401', async () => {
    const { respons, galat } = await kirim(null, {
      passwordLama: PASSWORD_TES,
      passwordBaru: PASSWORD_BARU,
    });

    expect(respons.status).toBe(401);
    expect(galat?.code).toBe('TIDAK_TERAUTENTIKASI');
  });

  it('menolak kata sandi lama yang salah tanpa mengubah apa pun dan tanpa audit', async () => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);

    const { respons, galat } = await kirim(cookie, {
      passwordLama: 'bukan-kata-sandi-lama',
      passwordBaru: PASSWORD_BARU,
    });

    expect(respons.status).toBe(400);
    expect(galat?.code).toBe('VALIDASI_GAGAL');
    expect(galat?.details?.fields).toEqual({ passwordLama: 'Kata sandi lama salah.' });
    expect((await masuk(pengguna.username, PASSWORD_TES)).galat).toBeNull();
    expect(await auditUntuk({ aktorLabel: pengguna.username, aksi: 'PASSWORD_GANTI' })).toEqual([]);
  });

  it.each([
    ['terlalu pendek', 'pendek123', 'Kata sandi baru minimal 12 karakter.'],
    [
      'sama dengan kata sandi lama',
      PASSWORD_TES,
      'Kata sandi baru harus berbeda dari kata sandi lama.',
    ],
  ])('menolak kata sandi baru yang %s', async (_nama, passwordBaru, pesan) => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);

    const { respons, galat } = await kirim(cookie, { passwordLama: PASSWORD_TES, passwordBaru });

    expect(respons.status).toBe(400);
    expect(galat?.details?.fields).toEqual({ passwordBaru: pesan });
  });

  it('menolak kata sandi baru yang sama dengan username', async () => {
    const pengguna = await buatPengguna({ password: 'kata-sandi-awal-12345' });
    const { cookie } = await masuk(pengguna.username, pengguna.password);

    // Username uji berisi 16 karakter, jadi lolos panjang minimum; hanya aturan username yang gagal.
    const { galat } = await kirim(cookie, {
      passwordLama: pengguna.password,
      passwordBaru: pengguna.username.toUpperCase(),
    });

    expect(galat?.details?.fields).toEqual({
      passwordBaru: 'Kata sandi tidak boleh sama dengan username.',
    });
  });

  it('menolak field tak dikenal dan isi yang bukan JSON', async () => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);

    const tambahan = await kirim(cookie, {
      passwordLama: PASSWORD_TES,
      passwordBaru: PASSWORD_BARU,
      peran: 'ADMIN',
    });
    const bukanJson = await POST(
      buatRequest('/api/akun/ganti-password', {
        method: 'POST',
        cookie,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(tambahan.respons.status).toBe(400);
    expect(tambahan.galat?.code).toBe('VALIDASI_GAGAL');
    expect(bukanJson.status).toBe(400);
  });

  it('memblokir tebakan kata sandi lama setelah 5 kegagalan beruntun', async () => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);

    for (let i = 0; i < 5; i++) {
      const { respons } = await kirim(cookie, {
        passwordLama: `tebakan-${i.toString()}-aaaaaaaa`,
        passwordBaru: PASSWORD_BARU,
      });
      expect(respons.status).toBe(400);
    }
    const { respons, galat } = await kirim(cookie, {
      passwordLama: PASSWORD_TES,
      passwordBaru: PASSWORD_BARU,
    });

    expect(respons.status).toBe(429);
    expect(galat?.code).toBe('TERLALU_BANYAK_PERMINTAAN');
    expect(respons.headers.get('Retry-After')).not.toBeNull();
  });
});
