import 'server-only';

import ExcelJS from 'exceljs';
import { unzipSync } from 'fflate';

import { formatTanggalLunas, parseTanggalLunas, teksSelAngka } from '@/lib/domain';
import { AppError } from '@/server/errors';

import { type IsiTabel } from './baca-csv';

/** Total ukuran tak terkompresi maksimum isi XLSX (SECURITY §8, perlindungan zip bomb). */
export const UKURAN_XLSX_TERURAI_MAKS = 200 * 1024 * 1024;

const PESAN_RUSAK =
  'File XLSX rusak atau bukan workbook Excel. Simpan ulang dari Excel lalu coba lagi.';

/** Hari 0 serial tanggal Excel dalam UTC (exceljs membaca serial sebagai waktu dinding UTC). */
const AWAL_SERIAL_EXCEL_MS = Date.UTC(1899, 11, 30);

/**
 * Memeriksa struktur zip sebelum workbook dibaca: harus berisi `xl/workbook.xml`, total ukuran
 * terurai ≤ 200 MB, dan setiap entri benar-benar terurai sesuai ukuran yang dinyatakan. fflate
 * menguraikan ke buffer seukuran yang dinyatakan, jadi entri yang "berbohong" gagal di sini dan
 * tidak pernah diuraikan tanpa batas oleh pembaca workbook.
 */
function periksaZip(bytes: Uint8Array): void {
  let total = 0;
  let isi: Record<string, Uint8Array>;
  try {
    isi = unzipSync(bytes, {
      filter: (entri) => {
        total += entri.originalSize;
        if (total > UKURAN_XLSX_TERURAI_MAKS) {
          throw new AppError(
            'FILE_TIDAK_VALID',
            400,
            'Isi file XLSX terlalu besar (lebih dari 200 MB setelah diurai).',
          );
        }
        return true;
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FILE_TIDAK_VALID', 400, PESAN_RUSAK);
  }
  const terurai = Object.values(isi).reduce((jumlah, b) => jumlah + b.length, 0);
  if (!('xl/workbook.xml' in isi) || terurai > UKURAN_XLSX_TERURAI_MAKS) {
    throw new AppError('FILE_TIDAK_VALID', 400, PESAN_RUSAK);
  }
}

/** Kolom tanggal lunas: sel tanggal/angka diubah ke teks format utama agar nilai asli terbaca. */
function teksTanggal(nilai: Date | number): string {
  const serial =
    nilai instanceof Date ? (nilai.getTime() - AWAL_SERIAL_EXCEL_MS) / 86_400_000 : nilai;
  const hasil = parseTanggalLunas(serial);
  return hasil.ok ? formatTanggalLunas(hasil.value) : teksSelAngka(serial);
}

/**
 * Nilai tampilan sel sebagai teks. Rumus TIDAK dievaluasi: hanya hasil tersimpan (cache) yang
 * dibaca, bila ada. Rich text digabung, hyperlink diambil teksnya.
 */
function teksSel(nilai: ExcelJS.CellValue, kolomTanggal: boolean): string {
  if (nilai === null || nilai === undefined) return '';
  if (typeof nilai === 'string') return nilai;
  if (typeof nilai === 'boolean') return nilai ? 'TRUE' : 'FALSE';
  if (typeof nilai === 'number') return kolomTanggal ? teksTanggal(nilai) : teksSelAngka(nilai);
  if (nilai instanceof Date) {
    return kolomTanggal
      ? teksTanggal(nilai)
      : formatTanggalLunas(new Date(nilai.getTime() - 7 * 3_600_000));
  }
  if ('richText' in nilai) return nilai.richText.map((r) => r.text).join('');
  if ('formula' in nilai || 'sharedFormula' in nilai) {
    const hasil = (nilai as { result?: ExcelJS.CellValue }).result;
    return hasil === undefined || (typeof hasil === 'object' && hasil !== null && 'error' in hasil)
      ? ''
      : teksSel(hasil, kolomTanggal);
  }
  if ('text' in nilai) return nilai.text;
  if ('error' in nilai) return '';
  return '';
}

/**
 * Membaca sheet pertama XLSX: baris 1 header, baris berikutnya data. Kolom yang judulnya diawali
 * "Tanggal Lunas" dibaca sebagai tanggal (termasuk serial Excel). Baris yang seluruhnya kosong
 * dilewati. Panjang setiap baris = jumlah sel sampai sel terakhir yang terisi, sehingga baris
 * berkolom lebih tetap terdeteksi sebagai FORMAT_BARIS.
 */
export async function bacaXlsx(bytes: Uint8Array): Promise<IsiTabel> {
  periksaZip(bytes);
  const buku = new ExcelJS.Workbook();
  try {
    await buku.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  } catch {
    throw new AppError('FILE_TIDAK_VALID', 400, PESAN_RUSAK);
  }
  const lembar = buku.worksheets[0];
  if (lembar === undefined) {
    throw new AppError('FILE_TIDAK_VALID', 400, 'File tidak berisi data peserta.');
  }
  const semua: string[][] = [];
  let kolomTanggal: boolean[] = [];
  lembar.eachRow({ includeEmpty: false }, (baris, nomor) => {
    const nilai = Array.isArray(baris.values) ? baris.values.slice(1) : [];
    const sel = nilai.map((v, i) => teksSel(v, kolomTanggal[i] ?? false));
    if (nomor === 1 || semua.length === 0) {
      kolomTanggal = sel.map((judul) => /^tanggal lunas/i.test(judul.trim()));
    }
    while (sel.length > 0 && (sel[sel.length - 1] ?? '').trim() === '') sel.pop();
    if (sel.length > 0) semua.push(sel);
  });
  const [header, ...data] = semua;
  if (header === undefined) {
    throw new AppError('FILE_TIDAK_VALID', 400, 'File tidak berisi data peserta.');
  }
  // Baris pendek (sel akhir kosong) dilengkapi sampai lebar header: sel kosong di Excel bukan
  // kesalahan format, berbeda dengan CSV yang jumlah pemisahnya memang kurang.
  const lebar = header.length;
  return {
    header,
    baris: data.map((b) =>
      b.length < lebar ? [...b, ...Array<string>(lebar - b.length).fill('')] : b,
    ),
  };
}
