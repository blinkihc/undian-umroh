import { describe, expect, it } from 'vitest';

import {
  awalHariWib,
  formatWaktuWib,
  isTanggalKalender,
  isoWib,
  rentangTanggalWib,
} from '@/lib/domain';

describe('isoWib dan formatWaktuWib', () => {
  it('menulis waktu UTC sebagai WIB (+07:00), termasuk pergantian hari', () => {
    const waktu = new Date('2026-09-30T16:59:59Z');

    expect(isoWib(waktu)).toBe('2026-09-30T23:59:59+07:00');
    expect(formatWaktuWib(waktu)).toBe('30/09/2026 23:59:59 WIB');
    expect(isoWib(new Date('2026-09-30T17:00:00Z'))).toBe('2026-10-01T00:00:00+07:00');
  });

  it('melengkapi angka satu digit dengan nol', () => {
    expect(formatWaktuWib(new Date('2026-01-01T01:02:03+07:00'))).toBe('01/01/2026 01:02:03 WIB');
  });
});

describe('isTanggalKalender', () => {
  it.each(['2026-10-12', '2024-02-29', '2026-12-31'])('menerima %s', (nilai) => {
    expect(isTanggalKalender(nilai)).toBe(true);
  });

  it.each(['2023-02-29', '2026-04-31', '2026-13-01', '12/10/2026', '2026-1-1', ''])(
    'menolak %j',
    (nilai) => {
      expect(isTanggalKalender(nilai)).toBe(false);
    },
  );
});

describe('rentang tanggal WIB', () => {
  it('awal hari WIB adalah 17:00 UTC hari sebelumnya', () => {
    expect(awalHariWib('2026-10-12').toISOString()).toBe('2026-10-11T17:00:00.000Z');
  });

  it('rentang inklusif: dari 00:00 WIB sampai sebelum 00:00 WIB hari berikutnya', () => {
    const rentang = rentangTanggalWib({ dari: '2026-10-01', sampai: '2026-10-12' });

    expect(rentang.gte?.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(rentang.lt?.toISOString()).toBe('2026-10-12T17:00:00.000Z');
  });

  it('hanya mengisi batas yang diberikan', () => {
    expect(rentangTanggalWib({})).toEqual({});
    expect(Object.keys(rentangTanggalWib({ sampai: '2026-10-12' }))).toEqual(['lt']);
  });
});
