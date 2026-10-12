import { describe, expect, it } from 'vitest';

import { AKSI_AUDIT, FilterAuditSchema, bersihkanPayloadAudit } from '@/lib/domain';

describe('AKSI_AUDIT', () => {
  it('tidak memuat kode ganda dan semuanya SCREAMING_SNAKE', () => {
    expect(new Set(AKSI_AUDIT).size).toBe(AKSI_AUDIT.length);
    for (const kode of AKSI_AUDIT) {
      expect(kode).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
    }
  });

  it('memuat kode autentikasi dan pengguna yang baku (OBSERVABILITY)', () => {
    expect(AKSI_AUDIT).toEqual(
      expect.arrayContaining([
        'LOGIN_BERHASIL',
        'LOGIN_GAGAL',
        'LOGIN_DIBLOKIR',
        'LOGOUT',
        'PASSWORD_GANTI',
        'PENGGUNA_BUAT',
        'PENGGUNA_UBAH',
        'PENGGUNA_AKTIFKAN',
        'PENGGUNA_NONAKTIFKAN',
        'PENGGUNA_RESET_PASSWORD',
      ]),
    );
  });
});

describe('FilterAuditSchema', () => {
  it('memberi bawaan halaman 1 dan ukuran 50, dan mengabaikan isian kosong dari form GET', () => {
    expect(FilterAuditSchema.parse({ aksi: '', aktor: '', dari: '', sampai: '' })).toEqual({
      page: 1,
      pageSize: 50,
    });
  });

  it('mengubah teks query menjadi angka dan merapikan aktor', () => {
    expect(
      FilterAuditSchema.parse({
        aksi: 'LOGIN_GAGAL',
        aktor: ' Admin.Bapenda ',
        dari: '2026-10-01',
        sampai: '2026-10-12',
        page: '3',
        pageSize: '20',
      }),
    ).toEqual({
      aksi: 'LOGIN_GAGAL',
      aktor: 'admin.bapenda',
      dari: '2026-10-01',
      sampai: '2026-10-12',
      page: 3,
      pageSize: 20,
    });
  });

  it.each([
    ['kode aksi tak dikenal', { aksi: 'HAPUS_SEMUA' }, 'aksi'],
    ['tanggal bukan YYYY-MM-DD', { dari: '12/10/2026' }, 'dari'],
    ['tanggal yang tidak ada', { sampai: '2026-02-30' }, 'sampai'],
    ['halaman nol', { page: '0' }, 'page'],
    ['ukuran halaman di atas 200', { pageSize: '201' }, 'pageSize'],
    ['halaman bukan angka', { page: 'dua' }, 'page'],
    ['field tak dikenal', { urut: 'asc' }, undefined],
  ])('menolak %s', (_nama, isi, field) => {
    const hasil = FilterAuditSchema.safeParse(isi);

    expect(hasil.success).toBe(false);
    if (field !== undefined) {
      expect(hasil.error?.issues[0]?.path).toEqual([field]);
    }
  });

  it('menolak tanggal akhir sebelum tanggal awal dengan pesan di field sampai', () => {
    const hasil = FilterAuditSchema.safeParse({ dari: '2026-10-12', sampai: '2026-10-01' });

    expect(hasil.error?.issues[0]).toMatchObject({
      path: ['sampai'],
      message: 'Tanggal akhir tidak boleh sebelum tanggal awal.',
    });
  });
});

describe('bersihkanPayloadAudit', () => {
  it('membuang field rahasia di tingkat mana pun tanpa memandang huruf besar-kecil', () => {
    expect(
      bersihkanPayloadAudit({
        username: 'operator1',
        passwordAwal: 'rahasia-1234',
        resetPassword: 'rahasia-5678',
        detail: { apiKey: 'x', Token: 'y', kataSandi: 'z', nikEnc: 'n', peran: 'ADMIN' },
        daftar: [{ captcha: 'c', aman: 1 }],
      }),
    ).toEqual({
      username: 'operator1',
      detail: { peran: 'ADMIN' },
      daftar: [{ aman: 1 }],
    });
  });

  it('menyamarkan teks berisi NIK 16 digit atau NOP 18 digit utuh', () => {
    expect(
      bersihkanPayloadAudit({
        catatan: 'NIK 1609999999990001 tertulis',
        nop: '160999999999999990',
        hash: 'a'.repeat(64),
        jumlah: 45812,
      }),
    ).toEqual({
      catatan: '[DISAMARKAN]',
      nop: '[DISAMARKAN]',
      hash: 'a'.repeat(64),
      jumlah: 45812,
    });
  });

  it('membiarkan nilai sederhana dan null', () => {
    expect(bersihkanPayloadAudit(null)).toBeNull();
    expect(bersihkanPayloadAudit(true)).toBe(true);
    expect(bersihkanPayloadAudit('teks biasa')).toBe('teks biasa');
  });
});
