import { z } from 'zod';

/** Skema satu peserta di dalam file snapshot kanonik (API.md §4.4). */
export const PesertaSnapshotSchema = z
  .object({
    urut: z.number().int().min(1),
    wilayah: z.enum(['W1', 'W2']),
    nopMasked: z.string().min(1),
    nikMasked: z.string().min(1),
    nama: z.string().min(1),
    alamatWp: z.string(),
    alamatOp: z.string(),
    kecamatan: z.string().min(1),
    kelurahan: z.string(),
    lunas: z.array(z.string()).length(5),
  })
  .strict();

export type PesertaSnapshot = z.infer<typeof PesertaSnapshotSchema>;

/** Skema file snapshot kanonik snapshot.json (API.md §4.4). */
export const SnapshotSchema = z
  .object({
    versiFormat: z.literal(1),
    periodeId: z.string().min(1),
    batasLunas: z.string().min(1),
    peserta: z.array(PesertaSnapshotSchema),
  })
  .strict();

export type SnapshotData = z.infer<typeof SnapshotSchema>;
