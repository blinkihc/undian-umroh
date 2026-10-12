import { describe, expect, it } from 'vitest';

import { FilterPesertaSchema, netralkanSelExcel, tafsirkanPencarian } from '@/lib/domain';

describe('FilterPesertaSchema', () => {
  it('isian kosong diabaikan dan paginasi bawaan 1/50', () => {
    expect(
      FilterPesertaSchema.parse({ status: '', wilayah: '', kecamatan: ' ', alasan: '', q: '' }),
    ).toEqual({ page: 1, pageSize: 50 });
  });

  it('menerima filter lengkap; kecamatan dinormalisasi', () => {
    expect(
      FilterPesertaSchema.parse({
        status: 'gugur',
        wilayah: 'BELUM_DIPETAKAN',
        kecamatan: ' muaradua  kisam ',
        alasan: 'LEWAT_BATAS_2026',
        q: ' budi ',
        page: '3',
        pageSize: '200',
      }),
    ).toEqual({
      status: 'gugur',
      wilayah: 'BELUM_DIPETAKAN',
      kecamatan: 'MUARADUA KISAM',
      alasan: 'LEWAT_BATAS_2026',
      q: 'budi',
      page: 3,
      pageSize: 200,
    });
  });

  it.each([
    [{ status: 'semua' }, 'status', 'Status harus lolos atau gugur.'],
    [{ wilayah: 'W3' }, 'wilayah', 'Wilayah tidak dikenal.'],
    [{ alasan: 'LEWAT_BATAS_2027' }, 'alasan', 'Kode alasan tidak dikenal.'],
    [{ pageSize: '201' }, 'pageSize', 'Ukuran halaman maksimal 200.'],
    [{ page: '0' }, 'page', 'Halaman minimal 1.'],
    [{ q: 'x'.repeat(101) }, 'q', 'Pencarian maksimal 100 karakter.'],
    [{ kecamatan: 'k'.repeat(101) }, 'kecamatan', 'Kecamatan maksimal 100 karakter.'],
  ])('menolak %j', (isi, field, pesan) => {
    const hasil = FilterPesertaSchema.safeParse(isi);
    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues[0]).toMatchObject({ path: [field], message: pesan });
  });

  it('menolak parameter tak dikenal', () => {
    expect(FilterPesertaSchema.safeParse({ urut: 'nama' }).success).toBe(false);
  });
});

describe('tafsirkanPencarian', () => {
  it('angka (termasuk bentuk NOP bertitik sebagian) dicari sebagai awalan NOP', () => {
    expect(tafsirkanPencarian('1609')).toEqual({ nopAwalan: '1609' });
    expect(tafsirkanPencarian('16.09.990.000')).toEqual({ nopAwalan: '1609990000' });
    expect(tafsirkanPencarian('16.09.990.000.000-0000.6')).toEqual({
      nopAwalan: '160999000000000006',
    });
  });

  it('teks lain dicari sebagai awalan nama', () => {
    expect(tafsirkanPencarian(' budi s ')).toEqual({ namaAwalan: 'budi s' });
    expect(tafsirkanPencarian('JL. 12')).toEqual({ namaAwalan: 'JL. 12' });
  });
});

describe('netralkanSelExcel', () => {
  it.each(['=SUM(A1)', '+62', '-1', '@cmd', '\tx', '\rx'])('menetralkan %j', (nilai) => {
    expect(netralkanSelExcel(nilai)).toBe(`'${nilai}`);
  });

  it('teks biasa tidak diubah', () => {
    expect(netralkanSelExcel('WAJIB PAJAK')).toBe('WAJIB PAJAK');
    expect(netralkanSelExcel('')).toBe('');
  });
});
