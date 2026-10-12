import { describe, expect, it } from 'vitest';

import {
  BuatPenggunaSchema,
  PESAN_UBAH_DITOLAK,
  UbahPenggunaSchema,
  periksaUbahPengguna,
  type PenggunaUntukAturan,
} from '@/lib/domain';

const PASSWORD = 'kata-sandi-awal-1';

describe('BuatPenggunaSchema', () => {
  it('merapikan username ke huruf kecil dan nama tanpa spasi tepi', () => {
    const hasil = BuatPenggunaSchema.parse({
      username: '  Operator.Satu ',
      nama: ' Operator Satu ',
      peran: 'OPERATOR',
      passwordAwal: PASSWORD,
    });

    expect(hasil).toEqual({
      username: 'operator.satu',
      nama: 'Operator Satu',
      peran: 'OPERATOR',
      passwordAwal: PASSWORD,
    });
  });

  it.each([
    ['terlalu pendek', 'ab'],
    ['terlalu panjang', 'a'.repeat(33)],
    ['berspasi', 'operator satu'],
    ['berkarakter lain', 'operator@1'],
  ])('menolak username %s dengan pesan pola', (_nama, username) => {
    const hasil = BuatPenggunaSchema.safeParse({
      username,
      nama: 'Uji',
      peran: 'ADMIN',
      passwordAwal: PASSWORD,
    });

    expect(hasil.error?.issues[0]?.message).toBe(
      'Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau strip.',
    );
  });

  it('menolak kata sandi awal kurang dari 12 karakter, nama kosong, dan peran tak dikenal', () => {
    const hasil = BuatPenggunaSchema.safeParse({
      username: 'operator1',
      nama: '   ',
      peran: 'SUPERADMIN',
      passwordAwal: 'pendek',
    });

    expect(hasil.error?.issues.map((isu) => [isu.path[0], isu.message])).toEqual([
      ['nama', 'Nama wajib diisi.'],
      ['peran', 'Peran harus Admin atau Operator.'],
      ['passwordAwal', 'Kata sandi awal minimal 12 karakter.'],
    ]);
  });

  it('menolak field tambahan', () => {
    expect(
      BuatPenggunaSchema.safeParse({
        username: 'operator1',
        nama: 'Uji',
        peran: 'ADMIN',
        passwordAwal: PASSWORD,
        aktif: false,
      }).success,
    ).toBe(false);
  });
});

describe('UbahPenggunaSchema', () => {
  it.each([
    [{ version: 1, aktif: false }],
    [{ version: 3, resetPassword: PASSWORD }],
    [{ version: 2, peran: 'ADMIN' }],
  ])('menerima satu perubahan %j', (isi) => {
    expect(UbahPenggunaSchema.safeParse(isi).success).toBe(true);
  });

  it.each([
    ['tanpa version', { aktif: true }],
    ['dua perubahan sekaligus', { version: 1, aktif: true, peran: 'ADMIN' }],
    ['tanpa perubahan', { version: 1 }],
    ['reset kata sandi pendek', { version: 1, resetPassword: 'pendek' }],
    ['version bukan bilangan bulat positif', { version: 0, aktif: true }],
  ])('menolak %s', (_nama, isi) => {
    expect(UbahPenggunaSchema.safeParse(isi).success).toBe(false);
  });
});

describe('periksaUbahPengguna', () => {
  const admin = (id: string, aktif = true): PenggunaUntukAturan => ({ id, peran: 'ADMIN', aktif });
  const operator: PenggunaUntukAturan = { id: 'op', peran: 'OPERATOR', aktif: true };

  it('menolak Admin menonaktifkan dirinya sendiri meski masih ada Admin lain', () => {
    expect(
      periksaUbahPengguna({
        aktorId: 'a1',
        target: admin('a1'),
        perubahan: { aktif: false },
        jumlahAdminAktif: 3,
      }),
    ).toEqual({ ok: false, error: 'UBAH_DIRI_SENDIRI' });
  });

  it('menolak Admin menurunkan perannya sendiri', () => {
    expect(
      periksaUbahPengguna({
        aktorId: 'a1',
        target: admin('a1'),
        perubahan: { peran: 'OPERATOR' },
        jumlahAdminAktif: 2,
      }),
    ).toEqual({ ok: false, error: 'UBAH_DIRI_SENDIRI' });
  });

  it('menolak menonaktifkan atau menurunkan Admin aktif terakhir', () => {
    for (const perubahan of [{ aktif: false }, { peran: 'OPERATOR' as const }]) {
      expect(
        periksaUbahPengguna({
          aktorId: 'lain',
          target: admin('a1'),
          perubahan,
          jumlahAdminAktif: 1,
        }),
      ).toEqual({ ok: false, error: 'ADMIN_TERAKHIR' });
    }
  });

  it('mengizinkan menonaktifkan Admin lain bila masih ada Admin aktif lain', () => {
    expect(
      periksaUbahPengguna({
        aktorId: 'a2',
        target: admin('a1'),
        perubahan: { aktif: false },
        jumlahAdminAktif: 2,
      }).ok,
    ).toBe(true);
  });

  it('mengizinkan menonaktifkan Operator dan perubahan yang tidak mengurangi Admin aktif', () => {
    const kasus = [
      { target: operator, perubahan: { aktif: false } },
      { target: admin('a1', false), perubahan: { peran: 'OPERATOR' as const } },
      { target: admin('a1'), perubahan: { aktif: true } },
      { target: operator, perubahan: { peran: 'ADMIN' as const } },
      { target: admin('a1'), perubahan: { peran: 'ADMIN' as const } },
    ];
    for (const { target, perubahan } of kasus) {
      expect(
        periksaUbahPengguna({ aktorId: 'admin-lain', target, perubahan, jumlahAdminAktif: 1 }).ok,
      ).toBe(true);
    }
  });

  it('mengizinkan mengaktifkan diri sendiri (tidak mengurangi akses)', () => {
    expect(
      periksaUbahPengguna({
        aktorId: 'a1',
        target: admin('a1'),
        perubahan: { aktif: true },
        jumlahAdminAktif: 1,
      }).ok,
    ).toBe(true);
  });

  it('memberi pesan Indonesia untuk setiap alasan', () => {
    expect(PESAN_UBAH_DITOLAK).toEqual({
      UBAH_DIRI_SENDIRI: 'Anda tidak dapat menonaktifkan atau menurunkan peran akun Anda sendiri.',
      ADMIN_TERAKHIR: 'Minimal satu Admin aktif harus tersisa.',
    });
  });
});
