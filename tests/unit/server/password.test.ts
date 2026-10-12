import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword, verifyPasswordPalsu } from '@/server/auth/password';

describe('hashPassword dan verifyPassword', () => {
  it('menghasilkan argon2id dengan parameter OWASP (19 MiB, 2 iterasi, 1 paralelisme)', async () => {
    const hash = await hashPassword('kata-sandi-uji-12345');

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(hash).not.toContain('kata-sandi-uji');
  });

  it('memberi hash berbeda untuk kata sandi yang sama (salt acak)', async () => {
    const [a, b] = await Promise.all([
      hashPassword('sama-saja-12345'),
      hashPassword('sama-saja-12345'),
    ]);

    expect(a).not.toBe(b);
  });

  it('memverifikasi kata sandi benar dan menolak yang salah', async () => {
    const hash = await hashPassword('kata-sandi-uji-12345');

    expect(await verifyPassword(hash, 'kata-sandi-uji-12345')).toBe(true);
    expect(await verifyPassword(hash, 'kata-sandi-uji-12346')).toBe(false);
  });

  it('menganggap hash rusak sebagai tidak cocok, bukan error', async () => {
    expect(await verifyPassword('bukan-hash-argon2', 'apa-saja')).toBe(false);
  });

  it('verifyPasswordPalsu selesai tanpa error dan memakai hash yang sama berulang', async () => {
    await expect(verifyPasswordPalsu('apa-saja-12345')).resolves.toBeUndefined();
    await expect(verifyPasswordPalsu('lagi-12345')).resolves.toBeUndefined();
  });
});
