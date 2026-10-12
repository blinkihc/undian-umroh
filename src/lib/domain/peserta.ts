import { z } from 'zod';

import { UKURAN_HALAMAN_BAWAAN, UKURAN_HALAMAN_MAKS } from './audit';
import { normalizeKecamatan } from './kecamatan';
import { KODE_ALASAN, type KodeAlasan } from './syarat';

/** Isian kosong dari form GET dianggap tidak difilter. */
function kosongJadiTanpaNilai(nilai: unknown): unknown {
  return typeof nilai === 'string' && nilai.trim() === '' ? undefined : nilai;
}

function opsional<T extends z.ZodType>(skema: T): z.ZodPreprocess<z.ZodOptional<T>> {
  return z.preprocess(kosongJadiTanpaNilai, skema.optional());
}

/**
 * Filter tabel peserta (API.md GET /api/periode/:id/peserta, UX_FLOWS Flow 3): status, wilayah,
 * kecamatan, kode alasan, pencarian NOP/awalan nama, dan paginasi.
 */
export const FilterPesertaSchema = z.strictObject({
  status: opsional(z.enum(['lolos', 'gugur'], { error: 'Status harus lolos atau gugur.' })),
  wilayah: opsional(z.enum(['W1', 'W2', 'BELUM_DIPETAKAN'], { error: 'Wilayah tidak dikenal.' })),
  kecamatan: opsional(
    z.string().max(100, 'Kecamatan maksimal 100 karakter.').transform(normalizeKecamatan),
  ),
  alasan: opsional(
    z.enum(KODE_ALASAN as [KodeAlasan, ...KodeAlasan[]], { error: 'Kode alasan tidak dikenal.' }),
  ),
  q: opsional(z.string().trim().max(100, 'Pencarian maksimal 100 karakter.')),
  page: z.preprocess(
    kosongJadiTanpaNilai,
    z.coerce.number().int().min(1, 'Halaman minimal 1.').default(1),
  ),
  pageSize: z.preprocess(
    kosongJadiTanpaNilai,
    z.coerce
      .number()
      .int()
      .min(1, 'Ukuran halaman minimal 1.')
      .max(UKURAN_HALAMAN_MAKS, `Ukuran halaman maksimal ${UKURAN_HALAMAN_MAKS.toString()}.`)
      .default(UKURAN_HALAMAN_BAWAAN),
  ),
});

export type FilterPeserta = z.infer<typeof FilterPesertaSchema>;

/**
 * Menafsirkan kotak pencarian: angka (boleh bertitik, strip, atau spasi seperti NOP tampilan)
 * dicari sebagai awalan NOP; selain itu sebagai awalan nama tanpa memandang huruf besar-kecil.
 */
export function tafsirkanPencarian(q: string): { nopAwalan: string } | { namaAwalan: string } {
  const digit = q.replace(/[.\-\s]/g, '');
  if (/^\d+$/.test(digit)) {
    return { nopAwalan: digit };
  }
  return { namaAwalan: q.trim() };
}

/** Awalan yang membuat Excel/Calc menafsirkan sel sebagai rumus (SECURITY §8, CSV injection). */
const AWALAN_RUMUS = ['=', '+', '-', '@', '\t', '\r'];

/** Menetralkan teks sel ekspor yang diawali karakter rumus dengan awalan `'`. */
export function netralkanSelExcel(nilai: string): string {
  return AWALAN_RUMUS.some((awalan) => nilai.startsWith(awalan)) ? `'${nilai}` : nilai;
}
