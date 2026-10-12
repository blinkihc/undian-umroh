import { describe, expect, it } from 'vitest';

import {
  BATAS_LUNAS_BAWAAN,
  BatalPeriodeSchema,
  BuatPeriodeSchema,
  JAM_BATAS_LUNAS,
  JUDUL_PERIODE_BAWAAN,
  LABEL_STATUS_PERIODE,
  PESAN_PERIODE_DITOLAK,
  STATUS_PERIODE,
  UbahPeriodeSchema,
  buatSlugPeriode,
  isPeriodeAktif,
  periksaBatalPeriode,
  periksaUbahPeriode,
  type StatusPeriode,
} from '@/lib/domain';

const DASAR = { judul: JUDUL_PERIODE_BAWAAN, batasLunas: BATAS_LUNAS_BAWAAN };

function pesanField(hasil: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const isu of hasil.error?.issues ?? []) {
    fields[isu.path.map(String).join('.')] ??= isu.message;
  }
  return fields;
}

describe('konstanta periode', () => {
  it('batas bawaan 30/09/2026 23:59:59 WIB dan jam batas form akhir hari WIB', () => {
    expect(new Date(BATAS_LUNAS_BAWAAN).toISOString()).toBe('2026-09-30T16:59:59.000Z');
    expect(`2026-09-30${JAM_BATAS_LUNAS}`).toBe(BATAS_LUNAS_BAWAAN);
  });

  it('setiap status punya label Indonesia', () => {
    expect(STATUS_PERIODE.map((s) => LABEL_STATUS_PERIODE[s])).toEqual([
      'Draf',
      'Terkunci',
      'Diundi',
      'Final',
      'Dipublikasi',
      'Dibatalkan',
    ]);
  });

  it.each<[StatusPeriode, boolean]>([
    ['DRAF', true],
    ['TERKUNCI', true],
    ['DIUNDI', true],
    ['FINAL', true],
    ['DIPUBLIKASI', false],
    ['DIBATALKAN', false],
  ])('status %s aktif = %s', (status, aktif) => {
    expect(isPeriodeAktif(status)).toBe(aktif);
  });
});

describe('BuatPeriodeSchema', () => {
  it('menerima isian lengkap dan merapikan teks', () => {
    const hasil = BuatPeriodeSchema.parse({
      judul: `  ${JUDUL_PERIODE_BAWAAN} `,
      batasLunas: BATAS_LUNAS_BAWAAN,
      tanggalAcara: '2026-10-20',
      lokasiAcara: ' Gedung Kesenian Muaradua ',
      namaWilayah: { W1: ' Wilayah Barat ', W2: 'Wilayah Timur' },
    });

    expect(hasil).toEqual({
      judul: JUDUL_PERIODE_BAWAAN,
      batasLunas: BATAS_LUNAS_BAWAAN,
      tanggalAcara: '2026-10-20',
      lokasiAcara: 'Gedung Kesenian Muaradua',
      namaWilayah: { W1: 'Wilayah Barat', W2: 'Wilayah Timur' },
    });
  });

  it('tanggal dan lokasi acara opsional; lokasi kosong menjadi null', () => {
    expect(BuatPeriodeSchema.parse(DASAR)).toEqual(DASAR);
    expect(BuatPeriodeSchema.parse({ ...DASAR, tanggalAcara: null, lokasiAcara: '  ' })).toEqual({
      ...DASAR,
      tanggalAcara: null,
      lokasiAcara: null,
    });
  });

  it.each([
    ['judul kosong', { ...DASAR, judul: '   ' }, 'judul', 'Judul minimal 5 karakter.'],
    [
      'judul terlalu panjang',
      { ...DASAR, judul: 'J'.repeat(151) },
      'judul',
      'Judul maksimal 150 karakter.',
    ],
    ['judul tidak dikirim', { batasLunas: BATAS_LUNAS_BAWAAN }, 'judul', 'Judul wajib diisi.'],
    [
      'batas tidak dikirim',
      { judul: JUDUL_PERIODE_BAWAAN },
      'batasLunas',
      'Tanggal batas wajib diisi.',
    ],
    [
      'batas tanpa zona waktu',
      { ...DASAR, batasLunas: '2026-09-30T23:59:59' },
      'batasLunas',
      'Tanggal batas harus berformat ISO 8601 dengan zona waktu.',
    ],
    [
      'batas sebelum 2026',
      { ...DASAR, batasLunas: '2025-12-31T23:59:59+07:00' },
      'batasLunas',
      'Tanggal batas tidak boleh sebelum 1 Januari 2026.',
    ],
    [
      'tanggal acara bukan kalender',
      { ...DASAR, tanggalAcara: '2026-02-30' },
      'tanggalAcara',
      'Tanggal acara tidak dikenali.',
    ],
    [
      'tanggal acara salah format',
      { ...DASAR, tanggalAcara: '20/10/2026' },
      'tanggalAcara',
      'Tanggal acara harus berformat YYYY-MM-DD.',
    ],
    [
      'lokasi terlalu panjang',
      { ...DASAR, lokasiAcara: 'L'.repeat(151) },
      'lokasiAcara',
      'Lokasi acara maksimal 150 karakter.',
    ],
    [
      'nama wilayah kosong',
      { ...DASAR, namaWilayah: { W1: ' ' } },
      'namaWilayah.W1',
      'Nama wilayah wajib diisi.',
    ],
    [
      'nama wilayah terlalu panjang',
      { ...DASAR, namaWilayah: { W2: 'W'.repeat(51) } },
      'namaWilayah.W2',
      'Nama wilayah maksimal 50 karakter.',
    ],
  ])('menolak %s dengan pesan di field', (_kasus, isi, field, pesan) => {
    expect(pesanField(BuatPeriodeSchema.safeParse(isi))[field]).toBe(pesan);
  });

  it('menerima batas tepat 1 Januari 2026 00:00 WIB', () => {
    expect(
      BuatPeriodeSchema.safeParse({ ...DASAR, batasLunas: '2026-01-01T00:00:00+07:00' }).success,
    ).toBe(true);
  });

  it('menolak field tak dikenal, termasuk tahun pajak dan kode wilayah lain', () => {
    expect(BuatPeriodeSchema.safeParse({ ...DASAR, tahunAwal: 2021 }).success).toBe(false);
    expect(BuatPeriodeSchema.safeParse({ ...DASAR, namaWilayah: { W3: 'Lain' } }).success).toBe(
      false,
    );
  });
});

describe('UbahPeriodeSchema', () => {
  it('menerima perubahan sebagian beserta version', () => {
    expect(UbahPeriodeSchema.parse({ version: 3, namaWilayah: { W1: 'Wilayah Barat' } })).toEqual({
      version: 3,
      namaWilayah: { W1: 'Wilayah Barat' },
    });
    expect(UbahPeriodeSchema.parse({ version: 1, tanggalAcara: null, lokasiAcara: null })).toEqual({
      version: 1,
      tanggalAcara: null,
      lokasiAcara: null,
    });
  });

  it('mewajibkan version dan minimal satu perubahan', () => {
    expect(pesanField(UbahPeriodeSchema.safeParse({ judul: JUDUL_PERIODE_BAWAAN }))).toHaveProperty(
      'version',
    );
    expect(pesanField(UbahPeriodeSchema.safeParse({ version: 2 }))['']).toBe(
      'Kirim minimal satu perubahan beserta version.',
    );
    expect(UbahPeriodeSchema.safeParse({ version: 0, judul: JUDUL_PERIODE_BAWAAN }).success).toBe(
      false,
    );
  });
});

describe('BatalPeriodeSchema', () => {
  it('alasan wajib 10–500 karakter setelah dirapikan', () => {
    expect(BatalPeriodeSchema.parse({ version: 1, alasan: '  Data ekspor salah  ' })).toEqual({
      version: 1,
      alasan: 'Data ekspor salah',
    });
    expect(
      pesanField(BatalPeriodeSchema.safeParse({ version: 1, alasan: ' singkat ' })).alasan,
    ).toBe('Alasan pembatalan minimal 10 karakter.');
    expect(
      pesanField(BatalPeriodeSchema.safeParse({ version: 1, alasan: 'a'.repeat(501) })).alasan,
    ).toBe('Alasan pembatalan maksimal 500 karakter.');
    expect(pesanField(BatalPeriodeSchema.safeParse({ version: 1 })).alasan).toBe(
      'Alasan pembatalan wajib diisi.',
    );
  });
});

describe('periksaUbahPeriode', () => {
  it.each<StatusPeriode>(['DRAF', 'TERKUNCI', 'DIUNDI', 'FINAL'])(
    'judul dan info acara boleh diubah saat %s',
    (status) => {
      expect(periksaUbahPeriode(status, {})).toEqual({ ok: true, value: true });
    },
  );

  it('tanggal batas hanya boleh diubah saat Draf', () => {
    expect(periksaUbahPeriode('DRAF', { batasLunas: BATAS_LUNAS_BAWAAN }).ok).toBe(true);
    expect(periksaUbahPeriode('TERKUNCI', { batasLunas: BATAS_LUNAS_BAWAAN })).toEqual({
      ok: false,
      error: 'BATAS_HANYA_DRAF',
    });
  });

  it.each<[StatusPeriode, string]>([
    ['DIPUBLIKASI', 'PERIODE_SUDAH_DIPUBLIKASI'],
    ['DIBATALKAN', 'PERIODE_SUDAH_DIBATALKAN'],
  ])('periode %s tidak dapat diubah sama sekali', (status, error) => {
    expect(periksaUbahPeriode(status, {})).toEqual({ ok: false, error });
  });
});

describe('periksaBatalPeriode', () => {
  it.each<StatusPeriode>(['DRAF', 'TERKUNCI'])('periode %s boleh dibatalkan', (status) => {
    expect(periksaBatalPeriode(status).ok).toBe(true);
  });

  it.each<[StatusPeriode, string]>([
    ['DIUNDI', 'PERIODE_SUDAH_DIUNDI'],
    ['FINAL', 'PERIODE_SUDAH_DIUNDI'],
    ['DIPUBLIKASI', 'PERIODE_SUDAH_DIPUBLIKASI'],
    ['DIBATALKAN', 'PERIODE_SUDAH_DIBATALKAN'],
  ])('periode %s ditolak dengan alasan %s', (status, error) => {
    expect(periksaBatalPeriode(status)).toEqual({ ok: false, error });
  });

  it('setiap alasan penolakan punya pesan Indonesia', () => {
    expect(Object.values(PESAN_PERIODE_DITOLAK).every((p) => p.length > 0)).toBe(true);
    expect(PESAN_PERIODE_DITOLAK.PERIODE_SUDAH_DIBATALKAN).toBe(
      'Periode sudah dibatalkan. Data tidak dapat diubah.',
    );
  });
});

describe('buatSlugPeriode', () => {
  it('memakai slug dasar bila belum dipakai', () => {
    expect(buatSlugPeriode(2026, [])).toBe('undian-umroh-2026');
    expect(buatSlugPeriode(2026, ['undian-umroh-2025'])).toBe('undian-umroh-2026');
  });

  it('memberi akhiran berurutan bila slug sudah dipakai', () => {
    expect(buatSlugPeriode(2026, ['undian-umroh-2026'])).toBe('undian-umroh-2026-2');
    expect(
      buatSlugPeriode(2026, ['undian-umroh-2026', 'undian-umroh-2026-2', 'undian-umroh-2026-3']),
    ).toBe('undian-umroh-2026-4');
  });
});
