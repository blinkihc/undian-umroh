import ExcelJS from 'exceljs';

import { HEADER_IMPOR } from '@/lib/domain';

/**
 * Workbook XLSX dummy dengan sel campur-aduk seperti ekspor nyata (tiket 07):
 * - baris 2: semua teks, lolos
 * - baris 3: NIK sebagai angka 16 digit, tanggal sebagai sel Date, lolos
 * - baris 4: tanggal sebagai serial Excel (angka), 2026 lewat batas
 * - baris 5: NOP sebagai angka 18 digit (presisi hilang) → NOP_INVALID
 * - baris 6: sel rumus (hasil tersimpan dibaca, rumus tidak dievaluasi), lolos
 * - baris 7: sel 2024 kosong, kolom akhir kosong (tidak dianggap format salah)
 * - baris 8: satu sel ekstra di luar header → FORMAT_BARIS
 * - lembar kedua diabaikan
 */
export async function buatXlsxCampuran(): Promise<Uint8Array> {
  const buku = new ExcelJS.Workbook();
  const lembar = buku.addWorksheet('Ekspor PBB');
  lembar.addRow([...HEADER_IMPOR]);
  const tetap = ['JL. A', 'DUSUN A', 'MUARADUA', 'PASAR'];
  lembar.addRow([
    '160999000000000301',
    '1609990101900301',
    'WAJIB PAJAK XLSX SATU',
    ...tetap,
    '10/06/2022 09:00:00',
    '12/07/2023 10:00:00',
    '05/08/2024 11:00:00',
    '13/04/2026 10:00:00',
    '11/08/2026 13:00:00',
  ]);
  // Date di exceljs = waktu dinding (UTC) yang tampil di Excel.
  lembar.addRow([
    '160999000000000302',
    1609990101900302,
    'WAJIB PAJAK XLSX DUA',
    ...tetap,
    new Date(Date.UTC(2022, 5, 29, 14, 14, 36)),
    new Date(Date.UTC(2023, 6, 12, 10, 0, 0)),
    new Date(Date.UTC(2024, 7, 5)),
    new Date(Date.UTC(2025, 7, 20, 12, 0, 0)),
    new Date(Date.UTC(2026, 8, 30, 23, 59, 59)),
  ]);
  lembar.addRow([
    '160999000000000303',
    '1609990101900303',
    'WAJIB PAJAK XLSX TIGA',
    ...tetap,
    44741.5932,
    45119.5,
    45509.25,
    45889.5,
    46296, // 02/10/2026
  ]);
  lembar.addRow([
    160999000000000304,
    '1609990101900304',
    'WAJIB PAJAK XLSX EMPAT',
    ...tetap,
    '10/06/2022',
    '12/07/2023',
    '05/08/2024',
    '20/08/2025',
    '11/08/2026',
  ]);
  lembar.addRow([
    '160999000000000305',
    '1609990101900305',
    { formula: 'UPPER("wajib pajak xlsx lima")', result: 'WAJIB PAJAK XLSX LIMA' },
    ...tetap,
    '10/06/2022',
    '12/07/2023',
    '05/08/2024',
    '20/08/2025',
    { formula: 'TEXT(46245,"dd/mm/yyyy")', result: '11/08/2026' },
  ]);
  lembar.addRow([
    '160999000000000306',
    '1609990101900306',
    'WAJIB PAJAK XLSX ENAM',
    'JL. B',
    'DUSUN B',
    'BUAY RUNJUNG',
    '',
    '10/06/2022',
    '12/07/2023',
    '',
    '20/08/2025',
    '11/08/2026',
  ]);
  lembar.addRow([
    '160999000000000307',
    '1609990101900307',
    'WAJIB PAJAK XLSX TUJUH',
    ...tetap,
    '10/06/2022',
    '12/07/2023',
    '05/08/2024',
    '20/08/2025',
    '11/08/2026',
    'SEL EKSTRA',
  ]);
  buku.addWorksheet('Catatan').addRow(['Lembar ini tidak dibaca.']);
  return new Uint8Array(await buku.xlsx.writeBuffer());
}
