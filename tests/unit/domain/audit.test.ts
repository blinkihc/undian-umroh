import { describe, expect, it } from 'vitest';

import { AKSI_AUDIT } from '@/lib/domain';

describe('AKSI_AUDIT', () => {
  it('tidak memuat kode ganda dan semuanya SCREAMING_SNAKE', () => {
    expect(new Set(AKSI_AUDIT).size).toBe(AKSI_AUDIT.length);
    for (const kode of AKSI_AUDIT) {
      expect(kode).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
    }
  });

  it('memuat kode autentikasi yang dipakai tiket login', () => {
    expect(AKSI_AUDIT).toEqual(
      expect.arrayContaining([
        'LOGIN_BERHASIL',
        'LOGIN_GAGAL',
        'LOGIN_DIBLOKIR',
        'LOGOUT',
        'PASSWORD_GANTI',
        'PENGGUNA_BUAT',
      ]),
    );
  });
});
