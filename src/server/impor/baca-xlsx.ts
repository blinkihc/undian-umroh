import 'server-only';

import ExcelJS from 'exceljs';
import { strFromU8, unzipSync } from 'fflate';

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
 * terurai ≤ 200 MB, dan setiap entri benar-benar terurai sesuai ukuran yang dinyatakan.
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
        return entri.name === 'xl/workbook.xml';
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FILE_TIDAK_VALID', 400, PESAN_RUSAK);
  }
  if (!('xl/workbook.xml' in isi) || total > UKURAN_XLSX_TERURAI_MAKS) {
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
 * Nilai tampilan sel sebagai teks untuk fallback ExcelJS.
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

/** Decode entitas standar XML. */
function bersihkanXml(teks: string): string {
  if (!teks.includes('&')) return teks;
  return teks
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Mem-parse tabel sharedStrings.xml (SST) ke array string. */
function uraiSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si\b[^>]*>(.*?)<\/si>/gs;
  let match: RegExpExecArray | null;
  while ((match = siRegex.exec(xml)) !== null) {
    const siContent = match[1] ?? '';
    const tRegex = /<t\b[^>]*>(.*?)<\/t>/gs;
    let tMatch: RegExpExecArray | null;
    let text = '';
    while ((tMatch = tRegex.exec(siContent)) !== null) {
      text += tMatch[1] ?? '';
    }
    strings.push(bersihkanXml(text));
  }
  return strings;
}

/** Mengonversi referensi sel seperti "A1" -> 0, "B1" -> 1, "AA1" -> 26. */
function indeksKolom(refSel: string): number {
  let col = 0;
  for (let i = 0; i < refSel.length; i++) {
    const code = refSel.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      col = col * 26 + (code - 64);
    } else {
      break;
    }
  }
  return col - 1;
}

/**
 * Pemroses cepat OpenXML untuk sheet pertama (memangkas waktu dari ~35 detik menjadi ~4.5 detik).
 */
function uraiSheetCepat(
  sheetXml: string,
  sst: string[],
): { header: string[]; baris: string[][] } | null {
  const barisKoleksi: string[][] = [];
  let kolomTanggal: boolean[] = [];

  const rowRegex = /<row\b[^>]*>(.*?)<\/row>/gs;
  const cellRegex =
    /<c\b([^>]*)>(?:<f\b[^>]*>.*?<\/f>)?(?:<v\b[^>]*>(.*?)<\/v>|<is\b[^>]*><t\b[^>]*>(.*?)<\/t><\/is>)?<\/c>/gs;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rowMatch[1] ?? '';
    const baris: string[] = [];
    let cellMatch: RegExpExecArray | null;
    cellRegex.lastIndex = 0;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1] ?? '';
      const val = cellMatch[2];
      const inlineVal = cellMatch[3];

      const rMatch = /\br="([A-Z]+[0-9]+)"/.exec(attrs);
      const cIdx = rMatch !== null && rMatch[1] !== undefined ? indeksKolom(rMatch[1]) : baris.length;
      while (baris.length < cIdx) baris.push('');

      const isString = /\bt="s"/.test(attrs);
      const isDate = /\bt="d"/.test(attrs);
      const isKolomTgl = kolomTanggal[cIdx] ?? false;

      let cellText = '';
      if (isString && val !== undefined) {
        cellText = sst[parseInt(val, 10)] ?? '';
      } else if (inlineVal !== undefined) {
        cellText = bersihkanXml(inlineVal);
      } else if (val !== undefined && val !== '') {
        const num = Number(val);
        if (!isNaN(num) && (isDate || isKolomTgl)) {
          cellText = teksTanggal(num);
        } else if (!isNaN(num) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(val.trim())) {
          cellText = isKolomTgl ? teksTanggal(num) : teksSelAngka(num);
        } else {
          cellText = bersihkanXml(val);
        }
      }

      baris[cIdx] = cellText;
    }

    if (barisKoleksi.length === 0) {
      kolomTanggal = baris.map((judul) => /^tanggal lunas/i.test(judul.trim()));
    }

    while (baris.length > 0 && (baris[baris.length - 1] ?? '').trim() === '') {
      baris.pop();
    }
    if (baris.length > 0) {
      barisKoleksi.push(baris);
    }
  }

  const [header, ...data] = barisKoleksi;
  if (header === undefined) {
    return null;
  }
  const lebar = header.length;
  return {
    header,
    baris: data.map((b) =>
      b.length < lebar ? [...b, ...Array<string>(lebar - b.length).fill('')] : b,
    ),
  };
}

/**
 * Membaca sheet pertama XLSX: mengutamakan parser OpenXML cepat berbasis streaming ZIP,
 * dengan fallback transparan ke ExcelJS bila berkas memiliki struktur kompleks.
 */
export async function bacaXlsx(bytes: Uint8Array): Promise<IsiTabel> {
  periksaZip(bytes);

  try {
    const zipFiles = unzipSync(bytes, {
      filter: (e) =>
        e.name === 'xl/sharedStrings.xml' ||
        e.name === 'xl/worksheets/sheet1.xml' ||
        (e.name.startsWith('xl/worksheets/') && e.name.endsWith('.xml')),
    });

    const sstXml = zipFiles['xl/sharedStrings.xml']
      ? strFromU8(zipFiles['xl/sharedStrings.xml'])
      : '';
    const sst = sstXml !== '' ? uraiSharedStrings(sstXml) : [];

    const sheetKey =
      'xl/worksheets/sheet1.xml' in zipFiles
        ? 'xl/worksheets/sheet1.xml'
        : Object.keys(zipFiles)
            .filter((k) => k.startsWith('xl/worksheets/') && k.endsWith('.xml'))
            .sort()[0];

    if (sheetKey !== undefined && zipFiles[sheetKey] !== undefined) {
      const sheetXml = strFromU8(zipFiles[sheetKey]!);
      const hasilCepat = uraiSheetCepat(sheetXml, sst);
      if (hasilCepat !== null) {
        return hasilCepat;
      }
    }
  } catch {
    // Abaikan dan lanjutkan ke fallback ExcelJS
  }

  // Fallback standar ke ExcelJS untuk format luar biasa / rumus kompleks
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
  const lebar = header.length;
  return {
    header,
    baris: data.map((b) =>
      b.length < lebar ? [...b, ...Array<string>(lebar - b.length).fill('')] : b,
    ),
  };
}
