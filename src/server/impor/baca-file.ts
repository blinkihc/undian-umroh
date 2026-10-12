import 'server-only';

import { AppError } from '@/server/errors';

import { bacaCsv, type IsiTabel } from './baca-csv';
import { bacaXlsx } from './baca-xlsx';

const PESAN_JENIS = 'File harus .csv atau .xlsx, maksimal 20 MB.';

/**
 * MIME yang diterima per jenis (SECURITY §8). Peramban di Windows dengan Excel terpasang
 * melaporkan CSV sebagai `application/vnd.ms-excel`, dan sebagian peramban mengirim kosong atau
 * `application/octet-stream`; isi file tetap diperiksa lewat magic bytes.
 */
const MIME_DITERIMA = {
  csv: ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
} as const;

const MIME_UMUM = ['', 'application/octet-stream'];

const POLA_EKSTENSI = /\.([a-z0-9]+)$/i;

function awalZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** Jenis file impor dari ekstensi, MIME, dan magic bytes; ketiganya harus konsisten. */
export function jenisFileImpor(file: {
  nama: string;
  mime: string;
  bytes: Uint8Array;
}): 'csv' | 'xlsx' {
  const ekstensi = POLA_EKSTENSI.exec(file.nama)?.[1]?.toLowerCase();
  if (ekstensi !== 'csv' && ekstensi !== 'xlsx') {
    throw new AppError('FILE_TIDAK_VALID', 400, PESAN_JENIS);
  }
  const mime = file.mime.split(';')[0]?.trim().toLowerCase() ?? '';
  const mimeCocok =
    MIME_UMUM.includes(mime) || (MIME_DITERIMA[ekstensi] as readonly string[]).includes(mime);
  const isiCocok = ekstensi === 'xlsx' ? awalZip(file.bytes) : !awalZip(file.bytes);
  if (!mimeCocok || !isiCocok) {
    throw new AppError(
      'FILE_TIDAK_VALID',
      400,
      'Isi file tidak sesuai ekstensinya. Simpan ulang sebagai .csv (pemisah titik koma) atau .xlsx.',
    );
  }
  return ekstensi;
}

/** Membaca file impor menjadi tabel teks (header + baris data). */
export async function bacaFileImpor(file: {
  nama: string;
  mime: string;
  bytes: Uint8Array;
}): Promise<IsiTabel> {
  return jenisFileImpor(file) === 'xlsx' ? bacaXlsx(file.bytes) : bacaCsv(file.bytes);
}
