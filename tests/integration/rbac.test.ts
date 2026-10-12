import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { POST as gantiPasswordPost } from '@/app/api/akun/ganti-password/route';
import { requireRole, requireUser } from '@/server/auth/sesi';
import { getDb, tutupDb } from '@/server/db';
import { withHandler } from '@/server/http';
import { getLimiterGagal } from '@/server/rate-limit';

import { buatRequest, masuk } from './helpers/aplikasi';
import { PASSWORD_TES, buatPengguna } from './helpers/pengguna';

/** Endpoint khusus tes yang memakai penjaga yang sama dengan endpoint sungguhan. */
const endpointAdmin = withHandler(async (request) => {
  const pengguna = await requireRole(request, ['ADMIN']);
  return { peran: pengguna.peran };
});

const endpointSemuaPeran = withHandler(async (request) => {
  const pengguna = await requireRole(request, ['ADMIN', 'OPERATOR']);
  return { peran: pengguna.peran };
});

const endpointTanpaPeran = withHandler(async (request) => {
  const pengguna = await requireUser(request);
  return { id: pengguna.id };
});

async function cookieUntuk(opsi: Parameters<typeof buatPengguna>[0] = {}): Promise<string> {
  const pengguna = await buatPengguna(opsi);
  const { cookie } = await masuk(pengguna.username, pengguna.password);
  return cookie ?? '';
}

async function galat(
  respons: Response,
): Promise<{ status: number; code: string; message: string }> {
  const isi = (await respons.json()) as { error: { code: string; message: string } };
  return { status: respons.status, code: isi.error.code, message: isi.error.message };
}

beforeEach(() => {
  getLimiterGagal('login').resetSemua();
  getLimiterGagal('ganti-password').resetSemua();
});

afterAll(async () => {
  await tutupDb();
});

describe('autentikasi dan peran di endpoint', () => {
  it('menolak permintaan tanpa sesi dengan 401 dan X-Request-Id', async () => {
    const respons = await endpointAdmin(buatRequest('/api/contoh'));

    expect(await galat(respons.clone())).toEqual({
      status: 401,
      code: 'TIDAK_TERAUTENTIKASI',
      message: 'Sesi Anda berakhir. Silakan masuk lagi.',
    });
    expect(respons.headers.get('X-Request-Id')).toMatch(/^req_[0-9A-Z]{26}$/);
  });

  it('mengizinkan Admin dan menolak Operator di endpoint khusus Admin dengan 403', async () => {
    const cookieAdmin = await cookieUntuk({ peran: 'ADMIN' });
    const cookieOperator = await cookieUntuk({ peran: 'OPERATOR' });

    const admin = await endpointAdmin(buatRequest('/api/contoh', { cookie: cookieAdmin }));
    const operator = await endpointAdmin(buatRequest('/api/contoh', { cookie: cookieOperator }));

    expect(admin.status).toBe(200);
    expect(await galat(operator)).toEqual({
      status: 403,
      code: 'AKSES_DITOLAK',
      message: 'Anda tidak memiliki akses ke halaman ini.',
    });
  });

  it('mengizinkan Admin dan Operator di endpoint untuk kedua peran', async () => {
    const admin = await endpointSemuaPeran(
      buatRequest('/api/contoh', { cookie: await cookieUntuk({ peran: 'ADMIN' }) }),
    );
    const operator = await endpointSemuaPeran(
      buatRequest('/api/contoh', { cookie: await cookieUntuk({ peran: 'OPERATOR' }) }),
    );

    expect(await admin.json()).toEqual({ peran: 'ADMIN' });
    expect(await operator.json()).toEqual({ peran: 'OPERATOR' });
  });

  it('memutus akses akun yang dinonaktifkan pada request berikutnya dengan respons yang sama', async () => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);
    const sebelum = await endpointTanpaPeran(buatRequest('/api/contoh', { cookie }));
    expect(sebelum.status).toBe(200);

    await getDb().pengguna.update({ where: { id: pengguna.id }, data: { aktif: false } });
    const sesudah = await endpointTanpaPeran(buatRequest('/api/contoh', { cookie }));
    const tanpaSesi = await endpointTanpaPeran(buatRequest('/api/contoh'));

    expect(await galat(sesudah)).toEqual(await galat(tanpaSesi));
  });

  it('memblokir akun wajib-ganti kata sandi dari endpoint lain', async () => {
    const baru = await buatPengguna({ mustChangePassword: true });
    const { cookie } = await masuk(baru.username, baru.password);

    const respons = await endpointSemuaPeran(buatRequest('/api/contoh', { cookie }));

    expect(await galat(respons)).toMatchObject({ status: 403, code: 'PASSWORD_HARUS_DIGANTI' });
  });

  it('menolak mutasi dengan Origin asing atau tanpa Origin dengan 403', async () => {
    const pengguna = await buatPengguna();
    const { cookie } = await masuk(pengguna.username, pengguna.password);
    const isi = { passwordLama: PASSWORD_TES, passwordBaru: 'kata-sandi-baru-9876' };

    const asing = await gantiPasswordPost(
      buatRequest('/api/akun/ganti-password', {
        json: isi,
        cookie,
        origin: 'https://jahat.example',
      }),
    );
    const tanpaOrigin = await gantiPasswordPost(
      buatRequest('/api/akun/ganti-password', { json: isi, cookie, origin: null }),
    );

    expect(await galat(asing)).toMatchObject({ status: 403, code: 'AKSES_DITOLAK' });
    expect(await galat(tanpaOrigin)).toMatchObject({ status: 403, code: 'AKSES_DITOLAK' });
    // Permintaan palsu tidak boleh mengubah apa pun.
    const baris = await getDb().pengguna.findUniqueOrThrow({ where: { id: pengguna.id } });
    expect(baris.mustChangePassword).toBe(false);
    expect((await masuk(pengguna.username, PASSWORD_TES)).galat).toBeNull();
  });

  it('tidak memeriksa Origin pada permintaan baca (GET)', async () => {
    const cookie = await cookieUntuk();

    const respons = await endpointTanpaPeran(buatRequest('/api/contoh', { cookie }));

    expect(respons.status).toBe(200);
  });
});
