import { expect, test, type Locator, type Page } from '@playwright/test';

import { APP_URL_E2E } from '../support/env-e2e';
import { buatPenggunaE2E, hitungAudit, type PenggunaE2E } from './helpers/db';

/** Banner galat di dalam form (Next.js juga memasang role="alert" untuk pengumuman rute). */
function alertForm(page: Page): Locator {
  return page.locator('form').getByRole('alert');
}

async function isiLogin(page: Page, username: string, password: string): Promise<void> {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Kata sandi').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
}

async function masuk(page: Page, pengguna: PenggunaE2E): Promise<void> {
  await page.goto('/login');
  await isiLogin(page, pengguna.username, pengguna.password);
}

test.describe('Login dan peran', () => {
  test('Admin masuk ke dasbor dengan cookie sesi httpOnly SameSite=Lax', async ({
    page,
    context,
  }) => {
    const admin = await buatPenggunaE2E({ peran: 'ADMIN', nama: 'Bu Admin' });

    await masuk(page, admin);

    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Dasbor' })).toBeVisible();
    const header = page.getByRole('banner');
    await expect(header.getByText('Bu Admin')).toBeVisible();
    await expect(header.getByText('Admin', { exact: true })).toBeVisible();

    const sesi = (await context.cookies()).find((cookie) =>
      cookie.name.endsWith('authjs.session-token'),
    );
    expect(sesi).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
    expect(await hitungAudit('LOGIN_BERHASIL', admin.username)).toBe(1);
  });

  test('Operator masuk ke halaman operator dan ditolak di halaman admin', async ({ page }) => {
    const operator = await buatPenggunaE2E({ peran: 'OPERATOR' });

    await masuk(page, operator);
    await expect(page).toHaveURL('/operator');
    await expect(page.getByRole('heading', { level: 1, name: 'Operator' })).toBeVisible();

    await page.goto('/admin');

    await expect(page).toHaveURL('/operator?ditolak=1');
    await expect(
      page
        .getByRole('alert')
        .or(page.getByRole('status'))
        .filter({ hasText: 'Anda tidak memiliki akses ke halaman ini.' }),
    ).toBeVisible();
  });

  test('tanpa sesi, halaman admin mengarahkan ke login lalu kembali ke halaman semula', async ({
    page,
  }) => {
    const admin = await buatPenggunaE2E({ peran: 'ADMIN' });

    await page.goto('/admin');
    await expect(page).toHaveURL('/login?callbackUrl=%2Fadmin');

    await isiLogin(page, admin.username, admin.password);

    await expect(page).toHaveURL('/admin');
  });

  test('tidak mengikuti callbackUrl ke situs luar', async ({ page }) => {
    const admin = await buatPenggunaE2E({ peran: 'ADMIN' });

    await page.goto('/login?callbackUrl=https%3A%2F%2Fjahat.example%2F');
    await isiLogin(page, admin.username, admin.password);

    await expect(page).toHaveURL('/admin');
  });

  test('kata sandi salah menampilkan pesan yang sama dan tetap di halaman login', async ({
    page,
  }) => {
    const admin = await buatPenggunaE2E();

    await page.goto('/login');
    await isiLogin(page, admin.username, 'bukan-kata-sandi-benar');

    await expect(alertForm(page)).toHaveText('Username atau kata sandi salah.');
    await expect(page).toHaveURL('/login');
    expect(await hitungAudit('LOGIN_GAGAL', admin.username)).toBe(1);
  });

  test('username yang tidak ada menampilkan pesan yang sama persis', async ({ page }) => {
    await page.goto('/login');
    await isiLogin(page, 'tidak-ada-pengguna-ini', 'apa-saja-12345');

    await expect(alertForm(page)).toHaveText('Username atau kata sandi salah.');
  });

  test('isian kosong ditolak di klien dengan pesan di bawah field', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Masuk' }).click();

    await expect(page.getByLabel('Username')).toHaveAccessibleDescription('Username wajib diisi.');
    await expect(page.getByLabel('Kata sandi')).toHaveAccessibleDescription(
      'Kata sandi wajib diisi.',
    );
  });

  test('lima kegagalan memblokir login 15 menit, termasuk untuk kata sandi benar', async ({
    page,
  }) => {
    const admin = await buatPenggunaE2E();
    await page.goto('/login');

    for (let i = 0; i < 5; i++) {
      await isiLogin(page, admin.username, `salah-${i.toString()}-aaaaaaaa`);
      await expect(alertForm(page)).toHaveText('Username atau kata sandi salah.');
    }
    await isiLogin(page, admin.username, admin.password);

    await expect(alertForm(page)).toHaveText('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
    await expect(page).toHaveURL('/login');
    expect(await hitungAudit('LOGIN_DIBLOKIR', admin.username)).toBe(1);
  });

  test('Keluar mengakhiri sesi dan halaman admin kembali meminta login', async ({ page }) => {
    const admin = await buatPenggunaE2E();
    await masuk(page, admin);
    await expect(page).toHaveURL('/admin');

    await page.getByRole('button', { name: 'Keluar' }).click();

    await expect(page).toHaveURL('/login');
    await page.goto('/admin');
    await expect(page).toHaveURL('/login?callbackUrl=%2Fadmin');
    expect(await hitungAudit('LOGOUT', admin.username)).toBe(1);
  });

  test('akun yang sudah masuk dialihkan dari /login ke berandanya', async ({ page }) => {
    const operator = await buatPenggunaE2E({ peran: 'OPERATOR' });
    await masuk(page, operator);
    await expect(page).toHaveURL('/operator');

    await page.goto('/login');

    await expect(page).toHaveURL('/operator');
  });
});

test.describe('Ganti kata sandi pertama', () => {
  test('akun baru wajib mengganti kata sandi sebelum membuka halaman lain', async ({ page }) => {
    const baru = await buatPenggunaE2E({ peran: 'ADMIN', mustChangePassword: true });
    const passwordBaru = 'kata-sandi-baru-9876';

    await masuk(page, baru);
    await expect(page).toHaveURL('/akun/ganti-password');
    await expect(page.getByRole('status')).toContainText('Anda harus mengganti kata sandi');

    // Halaman lain diblokir sampai kata sandi diganti.
    await page.goto('/admin');
    await expect(page).toHaveURL('/akun/ganti-password');

    await page.getByLabel('Kata sandi lama').fill(baru.password);
    await page.getByLabel(/^Kata sandi baru/).fill(passwordBaru);
    await page.getByLabel('Ulangi kata sandi baru').fill(passwordBaru);
    await page.getByRole('button', { name: 'Simpan kata sandi' }).click();

    await expect(page).toHaveURL('/admin');
    expect(await hitungAudit('PASSWORD_GANTI', baru.username)).toBe(1);

    // Kata sandi baru berlaku, yang lama tidak.
    await page.getByRole('button', { name: 'Keluar' }).click();
    await expect(page).toHaveURL('/login');
    await isiLogin(page, baru.username, baru.password);
    await expect(alertForm(page)).toHaveText('Username atau kata sandi salah.');
    await isiLogin(page, baru.username, passwordBaru);
    await expect(page).toHaveURL('/admin');
  });

  test('menolak kata sandi baru yang terlalu pendek dengan pesan di bawah field', async ({
    page,
  }) => {
    const baru = await buatPenggunaE2E({ mustChangePassword: true });
    await masuk(page, baru);
    await expect(page).toHaveURL('/akun/ganti-password');

    await page.getByLabel('Kata sandi lama').fill(baru.password);
    await page.getByLabel(/^Kata sandi baru/).fill('pendek');
    await page.getByLabel('Ulangi kata sandi baru').fill('pendek');
    await page.getByRole('button', { name: 'Simpan kata sandi' }).click();

    await expect(page.getByLabel(/^Kata sandi baru/)).toHaveAccessibleDescription(
      'Kata sandi baru minimal 12 karakter.',
    );
    await expect(page).toHaveURL('/akun/ganti-password');
  });
});

test.describe('Endpoint dasar', () => {
  test('/api/health publik, tanpa data sensitif, dengan X-Request-Id dan header keamanan', async ({
    request,
  }) => {
    const respons = await request.get('/api/health');

    expect(respons.status()).toBe(200);
    expect(await respons.json()).toEqual({ status: 'ok', db: 'ok', versi: '0.1.0' });
    expect(respons.headers()['x-request-id']).toMatch(/^req_[0-9A-Z]{26}$/);
    expect(respons.headers()['x-content-type-options']).toBe('nosniff');
    expect(respons.headers()['x-frame-options']).toBe('DENY');
    expect(respons.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(respons.headers()['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
    expect(respons.headers()['strict-transport-security']).toContain('max-age=31536000');
    expect(respons.headers()['x-powered-by']).toBeUndefined();
  });

  test('mutasi dengan Origin asing ditolak 403 dengan format error standar', async ({
    request,
  }) => {
    const respons = await request.post('/api/akun/ganti-password', {
      headers: { Origin: 'https://jahat.example' },
      data: { passwordLama: 'x', passwordBaru: 'y' },
    });

    expect(respons.status()).toBe(403);
    const isi = (await respons.json()) as { error: { code: string; requestId: string } };
    expect(isi.error.code).toBe('AKSES_DITOLAK');
    expect(isi.error.requestId).toBe(respons.headers()['x-request-id']);
  });

  test('endpoint terautentikasi tanpa sesi menjawab 401', async ({ request }) => {
    const respons = await request.post('/api/akun/ganti-password', {
      headers: { Origin: APP_URL_E2E },
      data: { passwordLama: 'x', passwordBaru: 'yyyyyyyyyyyy' },
    });

    expect(respons.status()).toBe(401);
  });
});
