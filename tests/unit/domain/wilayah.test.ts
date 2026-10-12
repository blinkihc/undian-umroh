import { describe, expect, it } from 'vitest';

import {
  PemetaanSchema,
  cariKecamatanMirip,
  hitungRingkasanWilayah,
  urutkanPemetaan,
} from '@/lib/domain';

describe('PemetaanSchema', () => {
  it('menerima W1, W2, dan null', () => {
    const isi = {
      version: 4,
      pemetaan: [
        { kecamatan: 'MUARADUA', wilayah: 'W1' },
        { kecamatan: 'SIMPANG', wilayah: null },
      ],
    };
    expect(PemetaanSchema.parse(isi)).toEqual(isi);
  });

  it('menolak kecamatan ganda, wilayah lain, daftar kosong, dan field tambahan', () => {
    const ganda = PemetaanSchema.safeParse({
      version: 1,
      pemetaan: [
        { kecamatan: 'A', wilayah: 'W1' },
        { kecamatan: 'A', wilayah: 'W2' },
      ],
    });
    expect(ganda.error?.issues[0]?.message).toBe('Kecamatan tidak boleh muncul dua kali.');
    expect(
      PemetaanSchema.safeParse({ version: 1, pemetaan: [{ kecamatan: 'A', wilayah: 'W3' }] })
        .success,
    ).toBe(false);
    expect(PemetaanSchema.safeParse({ version: 1, pemetaan: [] }).success).toBe(false);
    expect(
      PemetaanSchema.safeParse({ version: 1, pemetaan: [{ kecamatan: 'A', wilayah: 'W1', x: 1 }] })
        .success,
    ).toBe(false);
  });
});

describe('cariKecamatanMirip', () => {
  it('mengenali beda spasi dan beda satu huruf, tidak untuk nama pendek atau berbeda jauh', () => {
    const hasil = cariKecamatanMirip([
      'MUARA DUA KISAM',
      'MUARADUA KISAM',
      'BUAY RUNJUNG',
      'BUAY RUNJUNK',
      'SIMPANG',
      'KISAM TINGGI',
      'ABC',
      'ABD',
    ]);
    expect(hasil.get('MUARA DUA KISAM')).toEqual(['MUARADUA KISAM']);
    expect(hasil.get('MUARADUA KISAM')).toEqual(['MUARA DUA KISAM']);
    expect(hasil.get('BUAY RUNJUNG')).toEqual(['BUAY RUNJUNK']);
    expect(hasil.get('SIMPANG')).toEqual([]);
    expect(hasil.get('KISAM TINGGI')).toEqual([]);
    expect(hasil.get('ABC')).toEqual([]);
  });

  it('jarak dua huruf atau beda panjang besar tidak dianggap mirip', () => {
    const hasil = cariKecamatanMirip(['BANDING AGUNG', 'BANDUNG AGANG', 'BANDING AGUNG SELATAN']);
    expect(hasil.get('BANDING AGUNG')).toEqual([]);
  });
});

describe('ringkasan dan urutan pemetaan', () => {
  const baris = [
    { kecamatan: 'SIMPANG', wilayah: 'W2' as const, jumlahLolos: 5 },
    { kecamatan: 'BUAY RUNJUNG', wilayah: null, jumlahLolos: 7 },
    { kecamatan: 'MUARADUA', wilayah: 'W1' as const, jumlahLolos: 10 },
    { kecamatan: 'ADUMANIS', wilayah: null, jumlahLolos: 0 },
  ];

  it('menghitung kecamatan dan lolos per wilayah termasuk belum dipetakan', () => {
    expect(hitungRingkasanWilayah(baris)).toEqual({
      W1: { jumlahKecamatan: 1, jumlahLolos: 10 },
      W2: { jumlahKecamatan: 1, jumlahLolos: 5 },
      BELUM_DIPETAKAN: { jumlahKecamatan: 2, jumlahLolos: 7 },
    });
  });

  it('belum dipetakan di atas, lalu abjad', () => {
    expect(urutkanPemetaan(baris).map((b) => b.kecamatan)).toEqual([
      'ADUMANIS',
      'BUAY RUNJUNG',
      'MUARADUA',
      'SIMPANG',
    ]);
  });
});
