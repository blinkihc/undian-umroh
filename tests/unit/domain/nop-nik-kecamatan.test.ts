import { describe, expect, it } from 'vitest';

import {
  formatNop,
  isValidNik,
  maskNik,
  maskNop,
  normalizeKecamatan,
  normalizeNop,
} from '@/lib/domain';

describe('NOP (TESTING §2)', () => {
  it('18 digit berprefiks 1609 valid, diformat dan disamarkan', () => {
    expect(normalizeNop('160903000300300030')).toEqual({ ok: true, value: '160903000300300030' });
    expect(formatNop('160903000300300030')).toBe('16.09.030.003.003-0003.0');
    expect(maskNop('160903000300300030')).toBe('16.09.030.xxx.xxx-0003.0');
  });

  it('bentuk bertitik dinormalisasi ke 18 digit dan nilai di-trim', () => {
    expect(normalizeNop('16.09.030.003.003-0003.0')).toEqual({
      ok: true,
      value: '160903000300300030',
    });
    expect(normalizeNop(' 160903000300300030 ')).toEqual({
      ok: true,
      value: '160903000300300030',
    });
  });

  it.each([
    ['prefiks bukan 1609', '170903000300300030'],
    ['17 digit', '16090300030030003'],
    ['notasi ilmiah', '1,60903E+17'],
    ['kosong', '   '],
    ['bertitik salah pola', '16.09.030.003.003.0003.0'],
    ['berisi huruf', '16090300030030003A'],
  ])('%s → NOP_INVALID', (_kasus, nilai) => {
    expect(normalizeNop(nilai)).toEqual({ ok: false, error: 'NOP_INVALID' });
  });
});

describe('NIK (TESTING §2)', () => {
  it('16 digit valid dan disamarkan 4 awal + 4 akhir', () => {
    expect(isValidNik('1609040301650002')).toBe(true);
    expect(maskNik(' 1609040301650002 ')).toBe('1609xxxxxxxx0002');
  });

  it.each([
    ['notasi ilmiah', '1.60904E+15'],
    ['15 digit', '160904030165000'],
    ['kosong', ''],
  ])('%s tidak valid dan disamarkan "-"', (_kasus, nilai) => {
    expect(isValidNik(nilai)).toBe(false);
    expect(maskNik(nilai)).toBe('-');
  });
});

describe('normalizeKecamatan', () => {
  it('trim, huruf besar, spasi ganda dirapatkan', () => {
    expect(normalizeKecamatan('MUARA DUA KISAM ')).toBe('MUARA DUA KISAM');
    expect(normalizeKecamatan('muaradua  kisam')).toBe('MUARADUA KISAM');
    expect(normalizeKecamatan(' buay\trunjung ')).toBe('BUAY RUNJUNG');
  });
});
