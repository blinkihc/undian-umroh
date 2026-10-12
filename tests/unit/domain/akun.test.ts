import { describe, expect, it } from 'vitest';

import {
  GantiPasswordSchema,
  LoginSchema,
  PASSWORD_MAKS_PANJANG,
  USERNAME_POLA,
  berandaPeran,
  bolehAkses,
  jalurInternalAman,
  periksaPasswordBaru,
} from '@/lib/domain';

describe('USERNAME_POLA', () => {
  it.each(['admin.bapenda', 'operator_1', 'a-b', 'abc', 'a'.repeat(32)])('menerima %s', (nilai) => {
    expect(USERNAME_POLA.test(nilai)).toBe(true);
  });

  it.each(['ab', 'a'.repeat(33), 'Admin', 'dengan spasi', 'ünicode', ''])('menolak %j', (nilai) => {
    expect(USERNAME_POLA.test(nilai)).toBe(false);
  });
});

describe('LoginSchema', () => {
  it('merapikan username (trim dan huruf kecil) tanpa mengubah kata sandi', () => {
    const hasil = LoginSchema.parse({ username: '  Admin.Bapenda ', password: ' Rahasia ' });

    expect(hasil).toEqual({ username: 'admin.bapenda', password: ' Rahasia ' });
  });

  it('menolak isian kosong dengan pesan Indonesia', () => {
    const hasil = LoginSchema.safeParse({ username: '   ', password: '' });

    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues.map((isu) => isu.message)).toEqual([
      'Username wajib diisi.',
      'Kata sandi wajib diisi.',
    ]);
  });

  it('menolak field tak dikenal dan kata sandi terlalu panjang', () => {
    expect(LoginSchema.safeParse({ username: 'a', password: 'b', peran: 'ADMIN' }).success).toBe(
      false,
    );
    expect(
      LoginSchema.safeParse({ username: 'a', password: 'x'.repeat(PASSWORD_MAKS_PANJANG + 1) })
        .success,
    ).toBe(false);
  });

  it('tidak memeriksa pola username agar pesan gagal login tetap seragam', () => {
    expect(LoginSchema.safeParse({ username: 'Bukan Username!', password: 'x' }).success).toBe(
      true,
    );
  });
});

describe('GantiPasswordSchema', () => {
  it('menerima kata sandi baru tepat 12 karakter', () => {
    const hasil = GantiPasswordSchema.safeParse({
      passwordLama: 'lama',
      passwordBaru: 'x'.repeat(12),
    });

    expect(hasil.success).toBe(true);
  });

  it('menolak kata sandi baru 11 karakter dengan pesan minimal 12', () => {
    const hasil = GantiPasswordSchema.safeParse({
      passwordLama: 'lama',
      passwordBaru: 'x'.repeat(11),
    });

    expect(hasil.error?.issues[0]?.message).toBe('Kata sandi baru minimal 12 karakter.');
  });

  it('menolak kata sandi baru melebihi batas atas dan kata sandi lama kosong', () => {
    const hasil = GantiPasswordSchema.safeParse({
      passwordLama: '',
      passwordBaru: 'x'.repeat(PASSWORD_MAKS_PANJANG + 1),
    });

    expect(hasil.error?.issues.map((isu) => isu.message)).toEqual([
      'Kata sandi lama wajib diisi.',
      'Kata sandi baru maksimal 128 karakter.',
    ]);
  });
});

describe('periksaPasswordBaru', () => {
  it('menerima kata sandi yang memenuhi semua aturan', () => {
    expect(
      periksaPasswordBaru({
        passwordBaru: 'kata-sandi-baru-1',
        username: 'admin',
        passwordLama: 'lama',
      }),
    ).toEqual({ ok: true, value: true });
  });

  it('menolak yang kurang dari 12 karakter', () => {
    expect(periksaPasswordBaru({ passwordBaru: 'pendek', username: 'admin' })).toEqual({
      ok: false,
      error: 'TERLALU_PENDEK',
    });
  });

  it('menolak yang sama dengan username tanpa memandang huruf besar-kecil', () => {
    expect(
      periksaPasswordBaru({ passwordBaru: 'ADMIN.BAPENDA.2026', username: 'admin.bapenda.2026' }),
    ).toEqual({
      ok: false,
      error: 'SAMA_DENGAN_USERNAME',
    });
  });

  it('menolak yang sama dengan kata sandi lama, tetapi hanya bila kata sandi lama diberikan', () => {
    const masukan = { passwordBaru: 'kata-sandi-sama-1', username: 'admin' };

    expect(periksaPasswordBaru({ ...masukan, passwordLama: 'kata-sandi-sama-1' })).toEqual({
      ok: false,
      error: 'SAMA_DENGAN_LAMA',
    });
    expect(periksaPasswordBaru(masukan).ok).toBe(true);
  });
});

describe('berandaPeran dan bolehAkses', () => {
  it('mengarahkan Admin ke /admin dan Operator ke /operator', () => {
    expect(berandaPeran('ADMIN')).toBe('/admin');
    expect(berandaPeran('OPERATOR')).toBe('/operator');
  });

  it('mengizinkan Admin ke semua halaman', () => {
    expect(bolehAkses('ADMIN', '/admin/periode/1')).toBe(true);
    expect(bolehAkses('ADMIN', '/operator')).toBe(true);
  });

  it('membatasi Operator ke area operator dan akun', () => {
    expect(bolehAkses('OPERATOR', '/operator')).toBe(true);
    expect(bolehAkses('OPERATOR', '/operator/undian')).toBe(true);
    expect(bolehAkses('OPERATOR', '/akun/ganti-password')).toBe(true);
    expect(bolehAkses('OPERATOR', '/admin')).toBe(false);
    expect(bolehAkses('OPERATOR', '/admin/pengguna')).toBe(false);
    expect(bolehAkses('OPERATOR', '/operatorpalsu')).toBe(false);
  });
});

describe('jalurInternalAman (cegah open redirect)', () => {
  it.each(['/admin', '/admin/periode/1', '/operator/undian', '/pemenang?x=1'])(
    'menerima %s',
    (jalur) => {
      expect(jalurInternalAman(jalur)).toBe(jalur);
    },
  );

  it.each([
    ['URL luar', 'https://jahat.example/'],
    ['protokol-relatif', '//jahat.example'],
    ['garis miring terbalik', '/\\jahat.example'],
    ['tab disisipkan', '/\t/jahat.example'],
    ['baris baru disisipkan', '/\n/jahat.example'],
    ['karakter DEL', '/\u007f'],
    ['tanpa garis miring awal', 'admin'],
    ['halaman login (putaran)', '/login'],
    ['halaman login dengan query', '/login?callbackUrl=/admin'],
    ['API', '/api/health'],
    ['kosong', ''],
  ])('menolak %s', (_nama, nilai) => {
    expect(jalurInternalAman(nilai)).toBeNull();
  });

  it('menolak nilai bukan teks', () => {
    expect(jalurInternalAman(null)).toBeNull();
    expect(jalurInternalAman(undefined)).toBeNull();
  });

  it('tidak salah menolak jalur yang hanya diawali kata login atau api', () => {
    expect(jalurInternalAman('/login-info')).toBe('/login-info');
    expect(jalurInternalAman('/apiary')).toBe('/apiary');
  });
});
