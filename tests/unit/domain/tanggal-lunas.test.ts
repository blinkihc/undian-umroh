import { describe, expect, it } from 'vitest';

import { awalTahunWib, isoWib, parseTanggalLunas } from '@/lib/domain';

function iso(nilai: string | number): string {
  const hasil = parseTanggalLunas(nilai);
  if (!hasil.ok) throw new Error(`gagal: ${hasil.error}`);
  return isoWib(hasil.value);
}

describe('parseTanggalLunas (TESTING §2, zona WIB)', () => {
  it.each([
    ['29/06/2022 14:14:36', '2022-06-29T14:14:36+07:00'],
    ['29/06/2022', '2022-06-29T00:00:00+07:00'],
    ['29-06-2022', '2022-06-29T00:00:00+07:00'],
    ['2022-06-29', '2022-06-29T00:00:00+07:00'],
    ['2022-06-29T08:30:00', '2022-06-29T08:30:00+07:00'],
    ['2022-06-29 08:30', '2022-06-29T08:30:00+07:00'],
    ['9/6/2022 7:05', '2022-06-09T07:05:00+07:00'],
    ['29/02/2024 08:00:00', '2024-02-29T08:00:00+07:00'],
    [' 30/09/2026 23:59:59 ', '2026-09-30T23:59:59+07:00'],
  ])('%s → %s', (masukan, harapan) => {
    expect(iso(masukan)).toBe(harapan);
  });

  it('serial Excel 44741.5932 → 29/06/2022 14:14:12 WIB (±1 detik)', () => {
    expect(iso(44741.5932)).toBe('2022-06-29T14:14:12+07:00');
  });

  it.each([
    '29/02/2023 08:00:00',
    '31/04/2025',
    '06/29/2022',
    '29/06/22',
    '29/06/2022 24:00:00',
    '29/06/2022 10:60',
    '2022-13-01',
    '29.06.2022',
    '29/06-2022',
    'kemarin',
  ])('%s → TANGGAL_TIDAK_DIKENALI', (masukan) => {
    expect(parseTanggalLunas(masukan)).toEqual({ ok: false, error: 'TANGGAL_TIDAK_DIKENALI' });
  });

  it.each([0, -5, Number.NaN, 3_000_000])('serial %s di luar rentang tidak dikenali', (serial) => {
    expect(parseTanggalLunas(serial)).toEqual({ ok: false, error: 'TANGGAL_TIDAK_DIKENALI' });
  });

  it.each(['', '   '])('"%s" → TANGGAL_KOSONG', (masukan) => {
    expect(parseTanggalLunas(masukan)).toEqual({ ok: false, error: 'TANGGAL_KOSONG' });
  });

  it('awal tahun pajak adalah 1 Januari 00:00 WIB', () => {
    expect(isoWib(awalTahunWib(2022))).toBe('2022-01-01T00:00:00+07:00');
  });
});
