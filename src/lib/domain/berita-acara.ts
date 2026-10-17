import { z } from 'zod';

export const PanitiaSchema = z
  .object({
    nama: z.string().trim().min(1).max(100),
    jabatan: z.string().trim().min(1).max(100),
  })
  .strict();

export const SaksiSchema = z
  .object({
    nama: z.string().trim().min(1).max(100),
    instansi: z.string().trim().min(1).max(100),
  })
  .strict();

export const BeritaAcaraInputSchema = z
  .object({
    nomor: z.string().trim().max(100),
    tempat: z.string().trim().max(1000),
    hariTanggal: z.string().trim().max(1000),
    dasarKegiatan: z.string().trim().max(1000),
    panitia: z.array(PanitiaSchema).max(5),
    saksi: z.array(SaksiSchema).max(5),
    version: z.number().int().min(1),
  })
  .strict();

export type PanitiaItem = z.infer<typeof PanitiaSchema>;
export type SaksiItem = z.infer<typeof SaksiSchema>;
export type BeritaAcaraInput = z.infer<typeof BeritaAcaraInputSchema>;

export type BeritaAcaraRespons = {
  nomor: string;
  tempat: string;
  hariTanggal: string;
  dasarKegiatan: string;
  panitia: PanitiaItem[];
  saksi: SaksiItem[];
  version: number;
};

export type BeritaAcaraDetailRespons = BeritaAcaraRespons & {
  tersedia: boolean;
  pesan?: string;
  updatedAt?: string | null;
  updatedByNama?: string | null;
};

/**
 * Penetralan formula injeksi spreadsheet (SECURITY §8).
 * Menambahkan tanda petik tunggal bila teks berawalan =, +, -, atau @.
 */
export function netralkanFormulaExcel(nilai: string): string {
  if (/^[=+\-@]/.test(nilai)) {
    return `'${nilai}`;
  }
  return nilai;
}
