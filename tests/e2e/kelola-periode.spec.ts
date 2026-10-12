import { expect, test, type Page } from '@playwright/test';

import { buatPenggunaE2E, hitungAudit, kosongkanPeriode } from './helpers/db';

const JUDUL = 'Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026';
// Token DESIGN_SYSTEM §12 chip status: Draf neutral-50 (#F5F8FC), Dibatalkan danger-100 (#FEE2E2).
const NEUTRAL_50 = 'rgb(245, 248, 252)';
const DANGER_100 = 'rgb(254, 226, 226)';

async function masuk(page: Page, peran: 'ADMIN' | 'OPERATOR'): Promise<string> {
  const akun = await buatPenggunaE2E({ peran });
  await page.goto('/login');
  await page.getByLabel('Username').fill(akun.username);
  await page.getByLabel('Kata sandi').fill(akun.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(peran === 'ADMIN' ? '/admin' : '/operator');
  return akun.username;
}

// Tes berbagi satu periode dan aturan satu periode aktif, jadi dijalankan berurutan.
test.describe.configure({ mode: 'serial' });

test.describe('Kelola periode', () => {
  test.beforeAll(async () => {
    await kosongkanPeriode();
  });

  test('Admin membuat periode dari keadaan kosong dasbor', async ({ page }) => {
    const admin = await masuk(page, 'ADMIN');

    await expect(page.getByText('Belum ada periode undian.')).toBeVisible();
    await page.getByRole('link', { name: 'Buat Periode' }).click();
    await expect(page).toHaveURL('/admin/periode/baru');
    const form = page.getByRole('form', { name: 'Buat periode' });
    await expect(form.getByLabel('Judul')).toHaveValue(JUDUL);
    await expect(form.getByLabel('Tanggal batas lunas')).toHaveValue('2026-09-30');
    await form.getByLabel('Tanggal acara (opsional)').fill('2026-10-20');
    await form.getByLabel('Lokasi acara (opsional)').fill('Gedung Kesenian Muaradua');
    await form.getByLabel('Nama Wilayah 1').fill('Wilayah Barat');
    await form.getByRole('button', { name: 'Simpan' }).click();

    await expect(page).toHaveURL(/\/admin\/periode\/[a-z0-9]+$/);
    await expect(page.getByRole('heading', { level: 1, name: JUDUL })).toBeVisible();
    const ringkasan = page.getByRole('region', { name: 'Pengaturan Periode' });
    await expect(ringkasan).toContainText('30/09/2026 23:59:59 WIB');
    await expect(ringkasan).toContainText('20/10/2026');
    await expect(ringkasan).toContainText('Wilayah Barat');
    await expect(ringkasan).toContainText('Wilayah 2');
    expect(await hitungAudit('PERIODE_BUAT', admin)).toBe(1);
  });

  test('dasbor menampilkan periode dengan chip Draf dan menahan periode kedua', async ({
    page,
  }) => {
    await masuk(page, 'ADMIN');

    const baris = page.getByRole('row').filter({ hasText: JUDUL });
    await expect(baris).toContainText('20/10/2026');
    const chip = baris.getByText('Draf', { exact: true });
    await expect(chip).toBeVisible();
    expect(await chip.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(NEUTRAL_50);
    await expect(page.getByRole('link', { name: 'Buat Periode' })).toHaveCount(0);
    await expect(
      page.getByText(`Periode baru dapat dibuat setelah periode aktif (${JUDUL})`),
    ).toBeVisible();
    await page.screenshot({ path: 'test-results/visual/admin-dasbor-periode-desktop.png' });

    await page.goto('/admin/periode/baru');
    await expect(page.getByText(`Masih ada periode aktif: ${JUDUL}.`)).toBeVisible();
    await expect(page.getByRole('form', { name: 'Buat periode' })).toHaveCount(0);
  });

  test('Admin mengubah lokasi acara lewat menu Periode', async ({ page }) => {
    const admin = await masuk(page, 'ADMIN');

    await page
      .getByRole('navigation', { name: 'Menu Admin' })
      .getByRole('link', { name: 'Periode' })
      .click();
    await expect(page).toHaveURL('/admin/periode');
    await expect(page.getByRole('heading', { level: 1, name: 'Periode Undian' })).toBeVisible();
    await page.getByRole('link', { name: JUDUL }).click();
    const form = page.getByRole('form', { name: 'Ubah periode' });
    await form.getByLabel('Lokasi acara (opsional)').fill('Aula Bapenda OKU Selatan');
    await form.getByRole('button', { name: 'Simpan' }).click();

    await expect(page.getByText('Perubahan periode disimpan.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Pengaturan Periode' })).toContainText(
      'Aula Bapenda OKU Selatan',
    );
    expect(await hitungAudit('PERIODE_UBAH', admin)).toBe(1);
    await page.screenshot({
      path: 'test-results/visual/admin-periode-detail-desktop.png',
      fullPage: true,
    });
  });

  test('Operator melihat daftar dan detail periode tanpa kontrol ubah', async ({ page }) => {
    await masuk(page, 'OPERATOR');

    await page.getByRole('link', { name: JUDUL }).click();
    await expect(page).toHaveURL(/\/operator\/periode\/[a-z0-9]+$/);
    await expect(page.getByRole('region', { name: 'Pengaturan Periode' })).toContainText(
      'Aula Bapenda OKU Selatan',
    );
    await expect(page.getByRole('form')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Batalkan Periode' })).toHaveCount(0);

    await page.goto('/admin/periode');
    await expect(page).toHaveURL('/operator?ditolak=1');
  });

  test('Admin membatalkan periode dengan alasan lalu dapat membuat periode baru', async ({
    page,
  }) => {
    const admin = await masuk(page, 'ADMIN');
    await page.getByRole('link', { name: JUDUL }).click();

    await page.getByRole('button', { name: 'Batalkan Periode' }).click();
    await page
      .getByLabel(/^Alasan pembatalan/)
      .fill('Data uji salah kecamatan, perlu periode baru');
    await page.getByRole('button', { name: 'Ya, batalkan periode' }).click();

    await expect(page.getByText('Periode ini dibatalkan.')).toBeVisible();
    await expect(
      page.getByText('Alasan: Data uji salah kecamatan, perlu periode baru'),
    ).toBeVisible();
    const chip = page.getByText('Dibatalkan', { exact: true });
    expect(await chip.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(DANGER_100);
    await expect(page.getByRole('form', { name: 'Ubah periode' })).toHaveCount(0);
    expect(await hitungAudit('PERIODE_BATAL', admin)).toBe(1);

    await page.goto('/admin');
    await expect(page.getByRole('link', { name: 'Buat Periode' })).toBeVisible();
  });
});
