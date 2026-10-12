import { randomBytes } from 'node:crypto';

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';
import { pastikanAdminAwal } from '@/server/services/pengguna';

import { masuk } from './helpers/aplikasi';
import { auditUntuk } from './helpers/pengguna';

const PASSWORD_SEED = 'sementara-seed-12345';

function usernameBaru(): string {
  return `seed-${randomBytes(5).toString('hex')}`;
}

beforeEach(() => {
  getLimiterGagal('login').resetSemua();
});

afterAll(async () => {
  await tutupDb();
});

describe('pastikanAdminAwal (seed Admin)', () => {
  it('membuat Admin yang wajib ganti kata sandi dan mencatat tepat satu audit', async () => {
    const username = usernameBaru();

    const hasil = await pastikanAdminAwal({ username, password: PASSWORD_SEED });

    expect(hasil).toBe('dibuat');
    const baris = await getDb().pengguna.findUniqueOrThrow({ where: { username } });
    expect(baris).toMatchObject({ peran: 'ADMIN', aktif: true, mustChangePassword: true });
    expect(baris.passwordHash).toMatch(/^\$argon2id\$/);
    expect(baris.passwordHash).not.toContain(PASSWORD_SEED);
    const audit = await auditUntuk({ targetId: baris.id });
    expect(audit).toEqual([
      expect.objectContaining({
        aksi: 'PENGGUNA_BUAT',
        aktorLabel: 'sistem',
        payload: { username, peran: 'ADMIN', sumber: 'seed' },
      }),
    ]);
    expect((await masuk(username, PASSWORD_SEED)).galat).toBeNull();
  });

  it('idempoten: menjalankan ulang tidak mengubah akun, kata sandi, maupun audit', async () => {
    const username = usernameBaru();
    await pastikanAdminAwal({ username, password: PASSWORD_SEED });
    const sebelum = await getDb().pengguna.findUniqueOrThrow({ where: { username } });

    const ulang = await pastikanAdminAwal({ username, password: 'kata-sandi-lain-98765' });

    expect(ulang).toBe('sudah-ada');
    const sesudah = await getDb().pengguna.findUniqueOrThrow({ where: { username } });
    expect(sesudah.passwordHash).toBe(sebelum.passwordHash);
    expect(await getDb().pengguna.count({ where: { username } })).toBe(1);
    expect(await auditUntuk({ targetId: sebelum.id })).toHaveLength(1);
  });

  it('menormalkan username ke huruf kecil', async () => {
    const username = usernameBaru();

    await pastikanAdminAwal({ username: ` ${username.toUpperCase()} `, password: PASSWORD_SEED });

    expect(await getDb().pengguna.count({ where: { username } })).toBe(1);
  });

  it.each([
    ['username tidak valid', 'Bukan Username', PASSWORD_SEED, /SEED_ADMIN_USERNAME tidak valid/],
    [
      'kata sandi terlalu pendek',
      'admin-pendek',
      'pendek',
      /SEED_ADMIN_PASSWORD ditolak: .*minimal 12/,
    ],
    [
      'kata sandi sama dengan username',
      'admin-sama-dengan-pass',
      'admin-sama-dengan-pass',
      /SEED_ADMIN_PASSWORD ditolak: .*username/,
    ],
  ])('menolak %s tanpa membuat akun', async (_nama, username, password, pesan) => {
    await expect(pastikanAdminAwal({ username, password })).rejects.toThrow(pesan);

    expect(await getDb().pengguna.count({ where: { username } })).toBe(0);
  });
});
