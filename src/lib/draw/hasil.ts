import { z } from 'zod';

import { canonicalStringify, sha256Hex } from '@/lib/package/hash';
import { SLOT_URUTAN } from '@/lib/package/kontrak';

import { type StateUndian } from './types';

export const SlotHasilItemSchema = z
  .object({
    urutan: z.number().int().min(1).max(SLOT_URUTAN.length),
    kode: z.enum(['W1-UTAMA', 'W2-UTAMA', 'W1-C1', 'W1-C2', 'W2-C1', 'W2-C2']),
    urut: z.number().int().min(1),
    diundiAt: z.string().min(1),
  })
  .strict();

export const PerangkatSchema = z
  .object({
    id: z.string().min(1),
    userAgent: z.string(),
  })
  .strict();

export const CatatanLokalItemSchema = z
  .object({
    at: z.string().min(1),
    jenis: z.string().min(1),
    slot: z.string().optional(),
    detail: z.string().optional(),
  })
  .strict();

export const HasilUndianTanpaHashSchema = z
  .object({
    versiFormat: z.literal(1),
    periodeId: z.string().min(1),
    snapshotHash: z.string().regex(/^[0-9a-f]{64}$/),
    temaConfigHash: z.string().regex(/^[0-9a-f]{64}$/),
    perangkat: PerangkatSchema,
    dimulaiAt: z.string().min(1),
    selesaiAt: z.string().min(1),
    slot: z.array(SlotHasilItemSchema).length(SLOT_URUTAN.length),
    catatanLokal: z.array(CatatanLokalItemSchema),
  })
  .strict();

export const HasilUndianSchema = HasilUndianTanpaHashSchema.extend({
  hasilHash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export type HasilUndianData = z.infer<typeof HasilUndianSchema>;
export type HasilUndianTanpaHash = z.infer<typeof HasilUndianTanpaHashSchema>;

/**
 * Menghitung hash SHA-256 kanonik dari file hasil (tanpa kunci hasilHash itu sendiri, API.md §4.5).
 */
export async function hitungHasilHash(
  isi: HasilUndianTanpaHash | (HasilUndianTanpaHash & { hasilHash?: string }),
): Promise<string> {
  const { hasilHash: _, ...tanpaHash } = isi as { hasilHash?: string } & HasilUndianTanpaHash;
  const jsonKanonik = canonicalStringify(tanpaHash);
  return sha256Hex(jsonKanonik);
}

/**
 * Membangun file hasil kanonik lengkap dari state undian yang telah selesai.
 */
export async function bangunFileHasil(params: {
  periodeId: string;
  snapshotHash: string;
  temaConfigHash: string;
  perangkat: { id: string; userAgent: string };
  state: StateUndian;
}): Promise<HasilUndianData> {
  const { periodeId, snapshotHash, temaConfigHash, perangkat, state } = params;

  if (state.slotSelesai.length !== SLOT_URUTAN.length) {
    throw new Error(`Seluruh ${SLOT_URUTAN.length} slot undian harus selesai sebelum menyusun file hasil.`);
  }

  const slotItems = state.slotSelesai.map((s) => ({
    urutan: s.urutan,
    kode: s.kode,
    urut: s.urut,
    diundiAt: s.diundiAt,
  }));

  const indexAkhir = state.slotSelesai.length - 1;
  const tanpaHash: HasilUndianTanpaHash = {
    versiFormat: 1,
    periodeId,
    snapshotHash,
    temaConfigHash,
    perangkat,
    dimulaiAt: state.dimulaiAt ?? state.slotSelesai[0]?.diundiAt ?? new Date().toISOString(),
    selesaiAt: state.selesaiAt ?? state.slotSelesai[indexAkhir]?.diundiAt ?? new Date().toISOString(),
    slot: slotItems,
    catatanLokal: state.catatanLokal,
  };

  const hasilHash = await hitungHasilHash(tanpaHash);

  return {
    ...tanpaHash,
    hasilHash,
  };
}
