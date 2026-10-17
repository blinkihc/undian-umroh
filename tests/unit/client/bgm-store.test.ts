import { describe, expect, it } from 'vitest';

import {
  formatDurasiMenitDetik,
  PENGATURAN_BGM_DEFAULT,
} from '@/client/offline/bgm-store';
import { ThemeConfigSchema, TEMA_DEFAULT } from '@/lib/package/theme';

describe('Unit: BGM Store & Tema Undian', () => {
  it('formatDurasiMenitDetik memformat angka detik ke format MM:SS dengan benar', () => {
    expect(formatDurasiMenitDetik(0)).toBe('0:00');
    expect(formatDurasiMenitDetik(45)).toBe('0:45');
    expect(formatDurasiMenitDetik(60)).toBe('1:00');
    expect(formatDurasiMenitDetik(125)).toBe('2:05');
    expect(formatDurasiMenitDetik(3665)).toBe('61:05');
    expect(formatDurasiMenitDetik(-5)).toBe('0:00');
  });

  it('PENGATURAN_BGM_DEFAULT memiliki konfigurasi bawaan yang sesuai spesifikasi', () => {
    expect(PENGATURAN_BGM_DEFAULT.loop).toBe(true);
    expect(PENGATURAN_BGM_DEFAULT.autoplay).toBe(false);
    expect(PENGATURAN_BGM_DEFAULT.volumeDefault).toBe(70);
    expect(PENGATURAN_BGM_DEFAULT.standbyTrackId).toBeNull();
    expect(PENGATURAN_BGM_DEFAULT.tegangTrackId).toBeNull();
  });

  it('ThemeConfigSchema memvalidasi judulAtas dan mempertahankan default bawaan', () => {
    const hasil = ThemeConfigSchema.parse(TEMA_DEFAULT);
    expect(hasil.teks.judulAtas).toBe('GEBYAR UNDIAN UMROH PBB-P2');

    // Kustom judul tema
    const kustom = {
      ...TEMA_DEFAULT,
      teks: {
        ...TEMA_DEFAULT.teks,
        judulAtas: 'MALAM ANUGERAH WAJIB PAJAK TELADAN',
      },
    };
    const hasilKustom = ThemeConfigSchema.parse(kustom);
    expect(hasilKustom.teks.judulAtas).toBe('MALAM ANUGERAH WAJIB PAJAK TELADAN');
  });
});
