import { describe, expect, it } from 'vitest';

import {
  BATAS_LUNAS_BAWAAN,
  HEADER_IMPOR,
  KODE_ALASAN,
  TAHUN_LUNAS,
  TAHUN_PAJAK,
  evaluasiImpor,
  isKodeAlasan,
  pesanAlasan,
  periksaHeader,
} from '@/lib/domain';

const ATURAN = { batasLunas: new Date(BATAS_LUNAS_BAWAAN) };

const PETA = (() => {
  const hasil = periksaHeader(HEADER_IMPOR);
  if (!hasil.ok) throw new Error('header uji salah');
  return hasil.value;
})();

type IsiBaris = {
  nop?: string;
  nik?: string;
  nama?: string;
  kecamatan?: string;
  lunas?: Partial<Record<(typeof TAHUN_LUNAS)[number], string>>;
};

const LUNAS_TEPAT = {
  2022: '10/06/2022 09:00:00',
  2023: '12/07/2023 10:00:00',
  2024: '05/08/2024 11:00:00',
  2025: '20/08/2025 12:00:00',
  2026: '11/08/2026 13:00:00',
};

/** Satu baris dummy 12 kolom (urutan HEADER_IMPOR). */
function baris(isi: IsiBaris = {}): string[] {
  const lunas = { ...LUNAS_TEPAT, ...isi.lunas };
  return [
    isi.nop ?? '160901000100100010',
    isi.nik ?? '1609010101800001',
    isi.nama ?? 'WAJIB PAJAK UJI',
    'JL. CONTOH NO. 1',
    'DUSUN CONTOH',
    isi.kecamatan ?? 'MUARADUA',
    'KELURAHAN CONTOH',
    ...TAHUN_LUNAS.map((t) => lunas[t]),
  ];
}

function evaluasi(...daftar: string[][]): ReturnType<typeof evaluasiImpor> {
  return evaluasiImpor({ baris: daftar, peta: PETA, aturan: ATURAN });
}

function alasan(isi: IsiBaris, aturan = ATURAN): string[] {
  const [p] = evaluasiImpor({ baris: [baris(isi)], peta: PETA, aturan }).peserta;
  return p?.alasan ?? ['?'];
}

describe('periksaHeader', () => {
  it('menerima header 12 kolom tanpa memandang huruf besar-kecil dan spasi ujung', () => {
    const acak = [...HEADER_IMPOR].reverse().map((k) => `  ${k.toUpperCase()} `);
    const hasil = periksaHeader(acak);
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.value.NOP).toBe(11);
      expect(hasil.value['Tanggal Lunas 2026']).toBe(0);
    }
  });

  it('melaporkan kolom hilang, tidak dikenal, dan kolom ganda', () => {
    const header = HEADER_IMPOR.map((k) => (k === 'Tanggal Lunas 2024' ? 'TGL_2024' : k));
    expect(periksaHeader([...header, 'nop'])).toEqual({
      ok: false,
      error: 'HEADER_TIDAK_SESUAI',
      details: { hilang: ['Tanggal Lunas 2024'], tidakDikenal: ['TGL_2024', 'nop'] },
    });
  });
});

describe('evaluasi syarat (TESTING §2, batas 30/09/2026 23:59:59 WIB)', () => {
  it('semua tahun lunas tepat waktu → lolos dengan data dirapikan dan NIK tersamar', () => {
    const { peserta } = evaluasi(baris({ kecamatan: ' muaradua  kisam ' }));
    expect(peserta[0]).toMatchObject({
      baris: 2,
      nop: '160901000100100010',
      nopValid: true,
      nikValid: true,
      nikMasked: '1609xxxxxxxx0001',
      kecamatanRaw: 'muaradua  kisam',
      kecamatan: 'MUARADUA KISAM',
      eligible: true,
      alasan: [],
    });
    expect(peserta[0]?.lunas[2022]?.toISOString()).toBe('2022-06-10T02:00:00.000Z');
    expect(peserta[0]?.lunasRaw[2026]).toBe('11/08/2026 13:00:00');
  });

  it.each([
    ['PBB 2025 dibayar 13/04/2026 (terlambat tetap sah)', { 2025: '13/04/2026 10:00:00' }],
    ['PBB 2026 dibayar 15/09/2026', { 2026: '15/09/2026 08:00:00' }],
    ['PBB 2026 dibayar tepat 30/09/2026 23:59:59 (inklusif)', { 2026: '30/09/2026 23:59:59' }],
  ])('%s → lolos', (_kasus, lunas) => {
    expect(alasan({ lunas })).toEqual([]);
  });

  it.each([
    [
      'PBB 2026 dibayar 01/10/2026 00:00:00',
      { lunas: { 2026: '01/10/2026 00:00:00' } },
      ['LEWAT_BATAS_2026'],
    ],
    [
      'lunas 2022 tertulis 15/12/2021',
      { lunas: { 2022: '15/12/2021' } },
      ['TANGGAL_SEBELUM_TAHUN_PAJAK_2022'],
    ],
    ['kolom 2024 kosong', { lunas: { 2024: '' } }, ['TANGGAL_KOSONG_2024']],
    [
      'format tanggal 2023 asing',
      { lunas: { 2023: '07/31/2023' } },
      ['TANGGAL_TIDAK_DIKENALI_2023'],
    ],
    [
      '2024 kosong dan 2026 lewat batas',
      { lunas: { 2024: ' ', 2026: '02/10/2026' } },
      ['TANGGAL_KOSONG_2024', 'LEWAT_BATAS_2026'],
    ],
    ['nama kosong', { nama: '  ' }, ['NAMA_KOSONG']],
    ['kecamatan kosong', { kecamatan: '' }, ['KECAMATAN_KOSONG']],
    ['NOP prefiks lain', { nop: '170901000100100010' }, ['NOP_INVALID']],
  ])('%s → %j', (_kasus, isi, harapan) => {
    expect(alasan(isi as IsiBaris)).toEqual(harapan);
  });

  it('batas diubah ke 31/08/2026: lunas 2026 bulan September menjadi LEWAT_BATAS_2026', () => {
    const aturan = { batasLunas: new Date('2026-08-31T23:59:59+07:00') };
    expect(alasan({ lunas: { 2026: '15/09/2026 08:00:00' } }, aturan)).toEqual([
      'LEWAT_BATAS_2026',
    ]);
  });

  it('NIK tidak valid hanya peringatan, baris tetap lolos', () => {
    const { peserta, ringkasan } = evaluasi(baris({ nik: '1.60904E+15' }));
    expect(peserta[0]).toMatchObject({ nikValid: false, nikMasked: '-', eligible: true });
    expect(ringkasan.nikTidakValid).toBe(1);
  });

  it('4 NOP dengan timestamp identik semuanya lolos (pembayaran kolektif)', () => {
    const sama = { 2026: '11/08/2026 13:00:00' };
    const { ringkasan } = evaluasi(
      ...['10', '20', '30', '40'].map((akhir) =>
        baris({ nop: `1609010001001000${akhir}`, lunas: sama }),
      ),
    );
    expect(ringkasan.jumlahLolos).toBe(4);
  });

  it('NOP muncul dua kali: kedua baris NOP_DUPLICATE, termasuk bentuk bertitik', () => {
    const { peserta, ringkasan } = evaluasi(
      baris(),
      baris({ nop: '16.09.010.001.001-0001.0', lunas: { 2024: '' } }),
      baris({ nop: '160901000100100020' }),
    );
    expect(peserta.map((p) => p.alasan)).toEqual([
      ['NOP_DUPLICATE'],
      ['NOP_DUPLICATE', 'TANGGAL_KOSONG_2024'],
      [],
    ]);
    expect(ringkasan.nopGanda).toBe(1);
  });

  it('jumlah kolom salah → hanya FORMAT_BARIS; baris lain tetap diproses', () => {
    const { peserta } = evaluasi(
      baris().slice(0, 10),
      [...baris({ nop: '160901000100100020' }), 'lebih'],
      baris({ nop: '160901000100100030' }),
    );
    expect(peserta.map((p) => [p.baris, p.alasan])).toEqual([
      [2, ['FORMAT_BARIS']],
      [3, ['FORMAT_BARIS']],
      [4, []],
    ]);
    expect(peserta[0]?.lunasRaw[2025]).toBe('');
  });

  it('NOP tidak valid disimpan mentah ter-trim dan tidak dihitung ganda', () => {
    const { peserta } = evaluasi(baris({ nop: ' ABC ' }), baris({ nop: 'ABC' }));
    expect(peserta.map((p) => [p.nop, p.alasan])).toEqual([
      ['ABC', ['NOP_INVALID']],
      ['ABC', ['NOP_INVALID']],
    ]);
  });
});

describe('ringkasan impor', () => {
  it('menghitung total, lolos, gugur per alasan berurutan, dan lolos per kecamatan', () => {
    const { ringkasan } = evaluasi(
      baris({ nop: '160901000100100010', kecamatan: 'BUAY RUNJUNG' }),
      baris({ nop: '160901000100100020', kecamatan: 'muaradua' }),
      baris({ nop: '160901000100100030', kecamatan: 'MUARADUA', lunas: { 2026: '' } }),
      baris({ nop: '170901000100100040', kecamatan: '', lunas: { 2022: '15/12/2021' } }),
    );
    expect(ringkasan).toEqual({
      totalBaris: 4,
      jumlahLolos: 2,
      jumlahGugur: 2,
      gugurPerAlasan: {
        NOP_INVALID: 1,
        KECAMATAN_KOSONG: 1,
        TANGGAL_KOSONG_2026: 1,
        TANGGAL_SEBELUM_TAHUN_PAJAK_2022: 1,
      },
      nikTidakValid: 0,
      nopGanda: 0,
      lolosPerKecamatan: { 'BUAY RUNJUNG': 1, MUARADUA: 1 },
    });
    expect(Object.keys(ringkasan.gugurPerAlasan)).toEqual([
      'NOP_INVALID',
      'KECAMATAN_KOSONG',
      'TANGGAL_KOSONG_2026',
      'TANGGAL_SEBELUM_TAHUN_PAJAK_2022',
    ]);
  });
});

describe('kode dan pesan alasan', () => {
  it('daftar kode memuat 5 alasan umum dan 4 jenis × 5 tahun', () => {
    expect(KODE_ALASAN).toHaveLength(25);
    expect(TAHUN_LUNAS[0]).toBe(TAHUN_PAJAK.awal);
    expect(TAHUN_LUNAS.at(-1)).toBe(TAHUN_PAJAK.akhir);
    expect(isKodeAlasan('LEWAT_BATAS_2026')).toBe(true);
    expect(isKodeAlasan('LEWAT_BATAS_2027')).toBe(false);
  });

  it.each([
    ['NOP_INVALID', 'NOP tidak valid (harus 18 digit dan diawali 1609).'],
    ['NOP_DUPLICATE', 'NOP muncul lebih dari satu kali dalam file.'],
    ['NAMA_KOSONG', 'Nama wajib pajak kosong.'],
    ['KECAMATAN_KOSONG', 'Kecamatan objek pajak kosong.'],
    ['FORMAT_BARIS', 'Jumlah kolom pada baris tidak sesuai dengan header.'],
    ['TANGGAL_KOSONG_2024', 'Tanggal lunas tahun 2024 kosong.'],
    ['TANGGAL_TIDAK_DIKENALI_2023', 'Format tanggal lunas tahun 2023 tidak dikenali.'],
    [
      'TANGGAL_SEBELUM_TAHUN_PAJAK_2022',
      'Tanggal lunas tahun 2022 lebih awal dari 1 Januari 2022 (data diduga salah).',
    ],
    ['LEWAT_BATAS_2026', 'Tanggal lunas tahun 2026 melewati tanggal batas.'],
  ] as const)('%s → pesan PRD', (kode, pesan) => {
    expect(pesanAlasan(kode)).toBe(pesan);
  });
});
