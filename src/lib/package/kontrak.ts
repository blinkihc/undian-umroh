import { z } from 'zod';

import { ThemeConfigSchema } from './theme';
import { SnapshotSchema } from './snapshot';

/** Daftar enam slot baku berurutan (API.md §4.3, PRD §6.0). */
export const SLOT_URUTAN = [
  { urutan: 1, kode: 'W1-UTAMA', wilayah: 'W1', label: 'Pemenang Utama' },
  { urutan: 2, kode: 'W1-C1', wilayah: 'W1', label: 'Cadangan 1' },
  { urutan: 3, kode: 'W1-C2', wilayah: 'W1', label: 'Cadangan 2' },
  { urutan: 4, kode: 'W2-UTAMA', wilayah: 'W2', label: 'Pemenang Utama' },
  { urutan: 5, kode: 'W2-C1', wilayah: 'W2', label: 'Cadangan 1' },
  { urutan: 6, kode: 'W2-C2', wilayah: 'W2', label: 'Cadangan 2' },
] as const;

export type KodeSlotPaket = (typeof SLOT_URUTAN)[number]['kode'];

/** Skema manifest.json di dalam paket zip (API.md §4.2). */
export const ManifestSchema = z
  .object({
    versiFormat: z.literal(1),
    file: z.record(z.string(), z.string().regex(/^[0-9a-f]{64}$/)),
  })
  .strict();

export type ManifestData = z.infer<typeof ManifestSchema>;

export const MetaWilayahSchema = z
  .object({
    kode: z.enum(['W1', 'W2']),
    nama: z.string().min(1),
    jumlahPeserta: z.number().int().min(0),
  })
  .strict();

export const MetaSlotSchema = z
  .object({
    urutan: z.number().int().min(1).max(6),
    kode: z.enum(['W1-UTAMA', 'W1-C1', 'W1-C2', 'W2-UTAMA', 'W2-C1', 'W2-C2']),
    wilayah: z.enum(['W1', 'W2']),
    label: z.string().min(1),
  })
  .strict();

export const MetaPeriodeSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    judul: z.string().min(1),
    tanggalAcara: z.string().nullable(),
    lokasiAcara: z.string().nullable(),
  })
  .strict();

/** Skema meta.json di dalam paket zip (API.md §4.3). */
export const MetaSchema = z
  .object({
    versiFormat: z.literal(1),
    aplikasiVersi: z.string().min(1),
    dibuatAt: z.string().min(1),
    periode: MetaPeriodeSchema,
    wilayah: z.array(MetaWilayahSchema).length(2),
    slot: z.array(MetaSlotSchema).length(6),
    snapshotHash: z.string().regex(/^[0-9a-f]{64}$/),
    temaConfigHash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export type MetaData = z.infer<typeof MetaSchema>;

export { SnapshotSchema, ThemeConfigSchema };
