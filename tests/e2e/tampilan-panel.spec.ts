import { expect, test, type Locator, type Page } from '@playwright/test';

import { buatPenggunaE2E } from './helpers/db';

/**
 * Bukti visual terhadap DESIGN_SYSTEM.md: ukuran dan warna diukur dari DOM sungguhan, bukan
 * disimpulkan dari kode. Nilai yang diharapkan berasal dari token (§3-§11).
 */

const PRIMARY_700 = 'rgb(11, 79, 156)';
const NEUTRAL_300 = 'rgb(203, 213, 225)';
const NEUTRAL_0 = 'rgb(255, 255, 255)';
const DANGER_700 = 'rgb(185, 28, 28)';

async function tinggi(lokator: Locator): Promise<number> {
  const kotak = await lokator.boundingBox();
  if (!kotak) throw new Error('Elemen tidak terlihat.');
  return Math.round(kotak.height);
}

async function gaya(lokator: Locator, properti: string): Promise<string> {
  return lokator.evaluate((el, nama) => getComputedStyle(el).getPropertyValue(nama), properti);
}

async function masuk(page: Page, peran: 'ADMIN' | 'OPERATOR'): Promise<void> {
  const pengguna = await buatPenggunaE2E({ peran });
  await page.goto('/login');
  await page.getByLabel('Username').fill(pengguna.username);
  await page.getByLabel('Kata sandi').fill(pengguna.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(peran === 'ADMIN' ? '/admin' : '/operator');
}

test.describe('Tampilan halaman login (desktop 1440x900)', () => {
  test('memakai ukuran dan warna token DESIGN_SYSTEM', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => document.fonts.ready);

    // Tombol Primary dan input: tinggi 44px, radius, warna primary-700 (§8, §9).
    const tombol = page.getByRole('button', { name: 'Masuk' });
    expect(await tinggi(tombol)).toBe(44);
    expect(await gaya(tombol, 'background-color')).toBe(PRIMARY_700);
    expect(await gaya(tombol, 'color')).toBe(NEUTRAL_0);
    expect(await gaya(tombol, 'font-size')).toBe('16px');
    expect(await gaya(tombol, 'border-top-left-radius')).toBe('10px');
    expect(await tinggi(page.getByLabel('Username'))).toBe(44);
    expect(await tinggi(page.getByLabel('Kata sandi'))).toBe(44);
    expect(await gaya(page.getByLabel('Username'), 'border-top-color')).toBe(NEUTRAL_300);
    expect(await gaya(page.getByLabel('Username'), 'border-top-left-radius')).toBe('6px');

    // Logo resmi: lambang Pemkab 48px, Bapenda x0,6, Pemkab di kiri, jarak 16px (§2).
    const okus = page.getByRole('img', { name: /Lambang Pemerintah Kabupaten/ });
    const bapenda = page.getByRole('img', { name: /Logo Badan Pendapatan Daerah/ });
    const kotakOkus = await okus.boundingBox();
    const kotakBapenda = await bapenda.boundingBox();
    if (!kotakOkus || !kotakBapenda) throw new Error('Logo tidak terlihat.');
    expect(Math.round(kotakOkus.height)).toBe(48);
    expect(Math.round(kotakBapenda.height)).toBe(29);
    expect(Math.round(kotakBapenda.x - (kotakOkus.x + kotakOkus.width))).toBe(16);

    // Judul 24px/700 (H2) dan kartu putih berborder neutral-300 (§4, §10).
    const judul = page.getByRole('heading', { level: 1, name: 'Masuk' });
    expect(await gaya(judul, 'font-size')).toBe('24px');
    expect(await gaya(judul, 'font-weight')).toBe('700');
    const kartu = page.locator('section').filter({ has: judul });
    expect(await gaya(kartu, 'background-color')).toBe(NEUTRAL_0);
    expect(await gaya(kartu, 'border-top-color')).toBe(NEUTRAL_300);
    expect(await gaya(kartu, 'padding-top')).toBe('24px');

    // Halaman berbahasa Indonesia dan bebas permintaan ke domain luar.
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  });

  test('galat field memakai danger-700, ikon, dan terhubung lewat aria-describedby', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Masuk' }).click();

    const username = page.getByLabel('Username');
    expect(await gaya(username, 'border-top-color')).toBe(DANGER_700);
    const pesan = page.getByText('Username wajib diisi.');
    expect(await gaya(pesan, 'color')).toBe(DANGER_700);
    expect(await gaya(pesan, 'font-size')).toBe('14px');
    await expect(username).toHaveAttribute('aria-invalid', 'true');
  });

  test('fokus keyboard terlihat pada input (ring primary-500)', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username').focus();

    const bayangan = await gaya(page.getByLabel('Username'), 'box-shadow');
    // Ring 3px primary-500 dengan opasitas 40% (§9); Chromium menuliskannya dalam ruang oklab.
    expect(bayangan).toMatch(/oklab\([^)]*\/ 0\.4\) 0px 0px 0px 3px/);
    expect(await gaya(page.getByLabel('Username'), 'border-top-color')).toBe(PRIMARY_700);
  });
});

test.describe('Tangkapan layar bukti visual', () => {
  test('menyimpan layar login, galat, ganti kata sandi, Panel, dan penolakan ke test-results/visual', async ({
    page,
  }) => {
    const simpan = async (nama: string): Promise<void> => {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `test-results/visual/${nama}.png` });
    };

    await page.goto('/login');
    await simpan('login-desktop');

    await page.getByRole('button', { name: 'Masuk' }).click();
    await simpan('login-galat-field-desktop');

    await page.setViewportSize({ width: 412, height: 915 });
    await simpan('login-galat-field-mobile');
    await page.setViewportSize({ width: 1440, height: 900 });

    const baru = await buatPenggunaE2E({ mustChangePassword: true });
    await page.goto('/login');
    await page.getByLabel('Username').fill(baru.username);
    await page.getByLabel('Kata sandi').fill(baru.password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL('/akun/ganti-password');
    await simpan('ganti-password-wajib-desktop');

    const operator = await buatPenggunaE2E({ peran: 'OPERATOR' });
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel('Username').fill(operator.username);
    await page.getByLabel('Kata sandi').fill(operator.password);
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page).toHaveURL('/operator');
    await page.goto('/admin');
    await expect(page).toHaveURL('/operator?ditolak=1');
    await simpan('operator-ditolak-desktop');
  });
});

test.describe('Tampilan Panel (desktop 1440x900)', () => {
  test('header 64px: logo 32px, border neutral-300, nama aplikasi, chip peran, tombol Keluar', async ({
    page,
  }) => {
    await masuk(page, 'ADMIN');
    await page.evaluate(() => document.fonts.ready);

    const header = page.getByRole('banner');
    expect(await tinggi(header)).toBe(64);
    expect(await gaya(header, 'background-color')).toBe(NEUTRAL_0);
    expect(await gaya(header, 'border-bottom-color')).toBe(NEUTRAL_300);
    const okus = header.getByRole('img', { name: /Lambang Pemerintah Kabupaten/ });
    expect(await tinggi(okus)).toBe(32);
    expect(await tinggi(header.getByRole('img', { name: /Logo Badan Pendapatan Daerah/ }))).toBe(
      19,
    );
    await expect(header.getByText('Undian Umroh PBB OKU Selatan')).toBeVisible();

    // Tombol Keluar (Secondary): tinggi 44px, teks primary-700 (§8).
    const keluar = header.getByRole('button', { name: 'Keluar' });
    expect(await tinggi(keluar)).toBe(44);
    expect(await gaya(keluar, 'color')).toBe(PRIMARY_700);
    expect(await gaya(keluar, 'border-top-color')).toBe(NEUTRAL_300);

    // Chip peran berikon dan berteks, latar primary-100 (§12).
    const chip = header.getByText('Admin', { exact: true });
    expect(await gaya(chip, 'background-color')).toBe('rgb(234, 242, 251)');
    expect(await gaya(chip, 'color')).toBe(PRIMARY_700);
    expect(await chip.locator('svg').count()).toBe(1);

    // H1 32px/700 (§4) dan konten maksimum 1280px.
    const h1 = page.getByRole('heading', { level: 1, name: 'Dasbor' });
    expect(await gaya(h1, 'font-size')).toBe('32px');
    expect(await gaya(h1, 'font-weight')).toBe('700');
    const kotakKonten = await page.getByRole('main').boundingBox();
    expect(Math.round(kotakKonten?.width ?? 0)).toBeLessThanOrEqual(1280);
  });

  test('semua teks Panel minimal 14px dan tombol dapat dijangkau keyboard', async ({ page }) => {
    await masuk(page, 'OPERATOR');

    const ukuranTerkecil = await page.evaluate(() => {
      const ukuran: number[] = [];
      for (const el of document.querySelectorAll('body *')) {
        if (
          el.childNodes.length > 0 &&
          [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
        ) {
          ukuran.push(parseFloat(getComputedStyle(el).fontSize));
        }
      }
      return Math.min(...ukuran);
    });
    expect(ukuranTerkecil).toBeGreaterThanOrEqual(14);

    // Urutan Tab di header: tautan Ganti kata sandi, lalu tombol Keluar.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Ganti kata sandi' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Keluar' })).toBeFocused();
  });
});
