import { expect, test } from '@playwright/test';

test.describe('Beranda publik', () => {
  test('menampilkan beranda bermerek berbahasa Indonesia dengan logo Pemkab di kiri Bapenda', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026',
    );

    const okus = page.getByRole('img', { name: /Lambang Pemerintah Kabupaten/ });
    const bapenda = page.getByRole('img', { name: /Logo Badan Pendapatan Daerah/ });
    await expect(okus).toBeVisible();
    await expect(bapenda).toBeVisible();

    // Gambar benar-benar termuat (bukan ikon rusak) dan urutannya Pemkab lalu Bapenda.
    for (const logo of [okus, bapenda]) {
      const lebarAsli = await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth);
      expect(lebarAsli).toBeGreaterThan(0);
    }
    const kotakOkus = await okus.boundingBox();
    const kotakBapenda = await bapenda.boundingBox();
    if (!kotakOkus || !kotakBapenda) throw new Error('Kotak logo tidak ditemukan.');
    expect(kotakOkus.x + kotakOkus.width).toBeLessThan(kotakBapenda.x);
  });

  test('tidak meminta sumber daya dari domain luar (font dan ikon lokal)', async ({ page }) => {
    const hostLuar = new Set<string>();
    page.on('request', (permintaan) => {
      const url = new URL(permintaan.url());
      if (url.hostname !== 'localhost') hostLuar.add(url.hostname);
    });

    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    expect([...hostLuar]).toEqual([]);
  });
});
