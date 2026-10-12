import { describe, expect, it } from 'vitest';

import {
  BATAS_SESI_MUTLAK_MS,
  INTERVAL_PERPANJANG_DETIK,
  MASA_SESI_DETIK,
  isCookieAman,
  namaCookieSesi,
} from '@/config/sesi';

describe('konstanta sesi (SECURITY §1)', () => {
  it('berlaku 8 jam, diperbarui tiap 15 menit, dan dibatasi mutlak 12 jam', () => {
    expect(MASA_SESI_DETIK).toBe(8 * 3600);
    expect(INTERVAL_PERPANJANG_DETIK).toBe(15 * 60);
    expect(BATAS_SESI_MUTLAK_MS).toBe(12 * 3600 * 1000);
  });
});

describe('cookie sesi', () => {
  it('Secure dan berawalan __Secure- hanya untuk APP_URL https', () => {
    expect(isCookieAman('https://undian.example.go.id')).toBe(true);
    expect(namaCookieSesi('https://undian.example.go.id')).toBe('__Secure-authjs.session-token');
  });

  it('tanpa awalan untuk http (pengembangan lokal)', () => {
    expect(isCookieAman('http://localhost:3000')).toBe(false);
    expect(namaCookieSesi('http://localhost:3000')).toBe('authjs.session-token');
  });
});
