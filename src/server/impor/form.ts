import 'server-only';

import { z } from 'zod';

import { AppError } from '@/server/errors';

/** Batas file impor 20 MB (PRD F1, SECURITY §8). */
export const UKURAN_IMPOR_MAKS = 20 * 1024 * 1024;

/** Kelonggaran untuk pembungkus multipart (batas, header bagian, field `version`). */
const KELONGGARAN_MULTIPART = 64 * 1024;

const PESAN_TERLALU_BESAR = 'File harus .csv atau .xlsx, maksimal 20 MB.';

const VersionSchema = z.coerce.number().int().min(1);

export type FormImpor = { nama: string; bytes: Uint8Array; version: number };

/**
 * Membaca `multipart/form-data` impor: field `file` dan `version`, tanpa field lain. Ukuran
 * diperiksa dari `Content-Length` sebelum isi dibaca, lalu dari ukuran file sebenarnya.
 */
export async function bacaFormImpor(request: Request): Promise<FormImpor> {
  const panjang = Number(request.headers.get('content-length') ?? 0);
  if (panjang > UKURAN_IMPOR_MAKS + KELONGGARAN_MULTIPART) {
    throw new AppError('FILE_TERLALU_BESAR', 413, PESAN_TERLALU_BESAR);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError('VALIDASI_GAGAL', 400, 'Kirim file lewat formulir unggah (multipart).');
  }
  const kunciLain = [...form.keys()].filter((k) => k !== 'file' && k !== 'version');
  const file = form.get('file');
  const version = VersionSchema.safeParse(form.get('version'));
  const fields: Record<string, string> = {};
  if (!(file instanceof File)) fields.file = 'Pilih file .csv atau .xlsx.';
  if (!version.success) fields.version = 'version wajib berupa bilangan bulat ≥ 1.';
  for (const kunci of kunciLain) fields[kunci] = 'Field tidak dikenal.';
  if (!(file instanceof File) || !version.success || kunciLain.length > 0) {
    throw new AppError('VALIDASI_GAGAL', 400, 'Data tidak valid.', { fields });
  }
  if (file.size > UKURAN_IMPOR_MAKS) {
    throw new AppError('FILE_TERLALU_BESAR', 413, PESAN_TERLALU_BESAR);
  }
  return {
    nama: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
    version: version.data,
  };
}
