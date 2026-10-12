import { randomBytes } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import { buatPenggunaE2E, hitungAudit } from './helpers/db';

const PRIMARY_700 = 'rgb(11, 79, 156)';
const PRIMARY_100 = 'rgb(234, 242, 251)';

async function masukAdmin(page: Page): Promise<string> {
  const admin = await buatPenggunaE2E({ peran: 'ADMIN', nama: 'Bu Admin' });
  await page.goto('/login');
  await page.getByLabel('Username').fill(admin.username);
  await page.getByLabel('Kata sandi').fill(admin.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL('/admin');
  return admin.username;
}

test.describe('Kelola pengguna dan log audit', () => {
  test('Admin menambah Operator, menonaktifkannya, lalu Operator tidak bisa masuk', async ({
    page,
    browser,
  }) => {
    const usernameAdmin = await masukAdmin(page);
    const username = `op-${randomBytes(4).toString('hex')}`;
    const password = 'kata-sandi-awal-2026';

    await page
      .getByRole('navigation', { name: 'Menu Admin' })
      .getByRole('link', { name: 'Pengguna' })
      .click();
    await expect(page).toHaveURL('/admin/pengguna');
    await page.getByRole('button', { name: 'Tambah Pengguna' }).click();
    const form = page.getByRole('form', { name: 'Tambah pengguna' });
    await form.getByLabel('Nama').fill('Operator Uji');
    await form.getByLabel('Username').fill(username);
    await form.getByLabel(/^Kata sandi awal/).fill(password);
    await form.getByRole('button', { name: 'Simpan' }).click();

    await expect(
      page.getByRole('status').filter({ hasText: `Akun ${username} dibuat.` }),
    ).toBeVisible();
    const baris = page.getByRole('row').filter({ hasText: username });
    await expect(baris).toContainText('Operator');
    await expect(baris).toContainText('Aktif');
    await expect(baris).toContainText('Wajib ganti kata sandi');
    await expect(baris).toContainText('Belum pernah');

    await baris.getByRole('button', { name: 'Nonaktifkan' }).click();
    await baris.getByRole('button', { name: 'Ya, nonaktifkan' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: `Akun ${username} dinonaktifkan.` }),
    ).toBeVisible();
    await expect(baris).toContainText('Nonaktif');
    await expect(baris.getByRole('button', { name: 'Aktifkan' })).toBeVisible();

    // Akun nonaktif tidak bisa masuk; pesannya sama dengan kredensial salah.
    const lain = await browser.newPage();
    await lain.goto('/login');
    await lain.getByLabel('Username').fill(username);
    await lain.getByLabel('Kata sandi').fill(password);
    await lain.getByRole('button', { name: 'Masuk' }).click();
    await expect(lain.locator('form').getByRole('alert')).toHaveText(
      'Username atau kata sandi salah.',
    );
    await lain.close();

    expect(await hitungAudit('PENGGUNA_BUAT', usernameAdmin)).toBe(1);
    expect(await hitungAudit('PENGGUNA_NONAKTIFKAN', usernameAdmin)).toBe(1);
  });

  test('akun sendiri ditandai (Anda) tanpa tombol Nonaktifkan', async ({ page }) => {
    await masukAdmin(page);
    await page.goto('/admin/pengguna');

    const baris = page.getByRole('row').filter({ hasText: '(Anda)' });
    await expect(baris).toContainText('Bu Admin');
    await expect(baris.getByRole('button', { name: 'Nonaktifkan' })).toHaveCount(0);
    await expect(baris.getByRole('button', { name: 'Reset kata sandi' })).toBeVisible();
  });

  test('Log Audit memfilter aksi dan aktor serta membuka detail payload', async ({ page }) => {
    const usernameAdmin = await masukAdmin(page);

    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { level: 1, name: 'Log Audit' })).toBeVisible();
    await page.getByLabel('Aksi').selectOption('LOGIN_BERHASIL');
    await page.getByLabel('Aktor (username)').fill(usernameAdmin);
    await page.getByRole('button', { name: 'Terapkan' }).click();

    await expect(page).toHaveURL(new RegExp(`aksi=LOGIN_BERHASIL.*aktor=${usernameAdmin}`));
    const baris = page.locator('tbody tr');
    await expect(baris).toHaveCount(1);
    await expect(baris).toContainText('LOGIN_BERHASIL');
    await expect(baris).toContainText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2} WIB/);
    await baris.getByText('Lihat').click();
    await expect(baris.getByText('Payload')).toBeVisible();
    await expect(page.getByText('Halaman 1 dari 1 · 1 entri')).toBeVisible();

    await page.getByLabel('Aktor (username)').fill('tidak-ada-aktor-ini');
    await page.getByRole('button', { name: 'Terapkan' }).click();
    await expect(page.getByText('Tidak ada aktivitas yang cocok dengan filter.')).toBeVisible();
  });

  test('filter tanggal tidak valid ditandai tanpa membuat halaman gagal', async ({ page }) => {
    await masukAdmin(page);

    await page.goto('/admin/audit?dari=2026-10-12&sampai=2026-10-01');

    await expect(page.getByLabel('Sampai tanggal')).toHaveAccessibleDescription(
      'Tanggal akhir tidak boleh sebelum tanggal awal.',
    );
    await expect(page.getByRole('alert').filter({ hasText: 'Filter tidak valid' })).toBeVisible();
  });

  test('sidebar Admin 256px dengan item aktif primary-100 dan garis kiri 3px', async ({ page }) => {
    await masukAdmin(page);
    await page.goto('/admin/pengguna');
    await page.evaluate(() => document.fonts.ready);

    const nav = page.getByRole('navigation', { name: 'Menu Admin' });
    expect(Math.round((await nav.boundingBox())?.width ?? 0)).toBe(256);
    const aktif = nav.getByRole('link', { name: 'Pengguna' });
    await expect(aktif).toHaveAttribute('aria-current', 'page');
    const gaya = await aktif.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        warna: s.color,
        garis: s.borderLeftWidth,
        garisWarna: s.borderLeftColor,
        tinggi: el.getBoundingClientRect().height,
      };
    });
    expect(gaya).toEqual({
      bg: PRIMARY_100,
      warna: PRIMARY_700,
      garis: '3px',
      garisWarna: PRIMARY_700,
      tinggi: 44,
    });
    await expect(nav.getByRole('link', { name: 'Log Audit' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.screenshot({ path: 'test-results/visual/admin-pengguna-desktop.png' });
    await page.goto('/admin/audit');
    await page.screenshot({ path: 'test-results/visual/admin-log-audit-desktop.png' });
  });

  test('Operator tidak dapat membuka halaman Pengguna dan Log Audit', async ({ page }) => {
    const operator = await buatPenggunaE2E({ peran: 'OPERATOR' });
    await page.goto('/login');
    await page.getByLabel('Username').fill(operator.username);
    await page.getByLabel('Kata sandi').fill(operator.password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL('/operator');

    for (const jalur of ['/admin/pengguna', '/admin/audit']) {
      await page.goto(jalur);
      await expect(page).toHaveURL('/operator?ditolak=1');
    }
    await expect(page.getByRole('navigation', { name: 'Menu Admin' })).toHaveCount(0);
  });
});
