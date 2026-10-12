import { z } from 'zod';

import { type KodeSlotPaket } from '@/lib/package/kontrak';
import { type KodeSlot, type StatusPemenang } from '@/generated/prisma/client';

export type StatusWilayah = 'ADA_PENERIMA' | 'TERVERIFIKASI' | 'PERLU_KEPUTUSAN';

export const DAFTAR_ALASAN_GUGUR = [
  'TIDAK_DAPAT_DIHUBUNGI',
  'MENGUNDURKAN_DIRI',
  'DATA_TIDAK_VALID',
  'LAINNYA',
] as const;

export type AlasanGugur = (typeof DAFTAR_ALASAN_GUGUR)[number];

export const LABEL_ALASAN_GUGUR: Record<AlasanGugur, string> = {
  TIDAK_DAPAT_DIHUBUNGI: 'Tidak dapat dihubungi',
  MENGUNDURKAN_DIRI: 'Mengundurkan diri',
  DATA_TIDAK_VALID: 'Data tidak valid',
  LAINNYA: 'Lainnya',
};

export const AlasanGugurSchema = z.enum(DAFTAR_ALASAN_GUGUR);

export const VerifikasiInputSchema = z
  .object({
    version: z.number().int().min(1),
  })
  .strict();

export const GugurInputSchema = z
  .object({
    version: z.number().int().min(1),
    alasan: AlasanGugurSchema,
    catatan: z.string().trim().min(5).max(500),
  })
  .strict();

export const LihatNikInputSchema = z
  .object({
    alasan: z.string().trim().min(5).max(500),
  })
  .strict();

export type VerifikasiInput = z.infer<typeof VerifikasiInputSchema>;
export type GugurInput = z.infer<typeof GugurInputSchema>;
export type LihatNikInput = z.infer<typeof LihatNikInputSchema>;

export const MAP_KODE_SLOT_DB_KE_PAKET: Record<KodeSlot, KodeSlotPaket> = {
  W1_UTAMA: 'W1-UTAMA',
  W1_C1: 'W1-C1',
  W1_C2: 'W1-C2',
  W2_UTAMA: 'W2-UTAMA',
  W2_C1: 'W2-C1',
  W2_C2: 'W2-C2',
};

export const MAP_KODE_SLOT_PAKET_KE_DB: Record<KodeSlotPaket, KodeSlot> = {
  'W1-UTAMA': 'W1_UTAMA',
  'W1-C1': 'W1_C1',
  'W1-C2': 'W1_C2',
  'W2-UTAMA': 'W2_UTAMA',
  'W2-C1': 'W2_C1',
  'W2-C2': 'W2_C2',
};

export function slotDbKePaket(slot: KodeSlot): KodeSlotPaket {
  return MAP_KODE_SLOT_DB_KE_PAKET[slot];
}

export function normalisasiKodeSlotDb(input: string): KodeSlot | null {
  const ternormalisasi = input.replace('-', '_');
  if (ternormalisasi in MAP_KODE_SLOT_DB_KE_PAKET) {
    return ternormalisasi as KodeSlot;
  }
  return null;
}

export type SlotRingkas = {
  kode: KodeSlotPaket;
  status: StatusPemenang;
  penerimaAktif: boolean;
};

/**
 * Menghitung status wilayah (API.md §Pemenang, DATABASE.md §3).
 * - PERLU_KEPUTUSAN bila ketiga slot berstatus GUGUR.
 * - TERVERIFIKASI bila penerima aktif berstatus TERVERIFIKASI.
 * - ADA_PENERIMA bila ada penerima aktif (berstatus MENANG).
 */
export function hitungStatusWilayah(slots: SlotRingkas[]): StatusWilayah {
  if (slots.length > 0 && slots.every((s) => s.status === 'GUGUR')) {
    return 'PERLU_KEPUTUSAN';
  }
  const adaTerverifikasi = slots.some((s) => s.penerimaAktif && s.status === 'TERVERIFIKASI');
  if (adaTerverifikasi) {
    return 'TERVERIFIKASI';
  }
  return 'ADA_PENERIMA';
}

export type HasilKenaikanCadangan = {
  slots: SlotRingkas[];
  promotedKode: KodeSlotPaket | null;
  statusWilayah: StatusWilayah;
};

export type RiwayatStatusRespons = {
  id: string;
  dari: StatusPemenang;
  ke: StatusPemenang;
  alasanGugur: string | null;
  catatan: string | null;
  oleh: string;
  at: string;
};

export type PesertaPemenangRespons = {
  nopFormat: string;
  nikMasked: string;
  nama: string;
  alamatWp: string;
  alamatOp: string;
  kecamatan: string;
  kelurahan: string;
  lunas: Record<string, string>;
};

export type SlotPemenangRespons = {
  kode: KodeSlotPaket;
  status: StatusPemenang;
  penerimaAktif: boolean;
  alasanGugur?: string | null;
  catatan?: string | null;
  peserta: PesertaPemenangRespons;
  version: number;
  riwayat: RiwayatStatusRespons[];
};

export type WilayahPemenangRespons = {
  kode: 'W1' | 'W2';
  nama: string;
  statusWilayah: StatusWilayah;
  slot: SlotPemenangRespons[];
};

export type PemenangPeriodeRespons = {
  wilayah: WilayahPemenangRespons[];
};

export type LihatNikRespons = {
  nik: string;
};

/**
 * Logika murni penandaan gugur dan kenaikan cadangan berikutnya (PRD F8, DECISIONS 007).
 * Urutan evaluasi: UTAMA -> C1 -> C2.
 * Jika penerima aktif gugur, cadangan berikutnya yang belum gugur naik otomatis menjadi MENANG dan penerima aktif.
 * Jika cadangan gugur sebelum utama, urutan naik nantinya akan melewati cadangan yang sudah gugur.
 */
export function hitungKenaikanCadangan(
  slotsWilayah: SlotRingkas[],
  targetKode: KodeSlotPaket,
): HasilKenaikanCadangan {
  const targetIndex = slotsWilayah.findIndex((s) => s.kode === targetKode);
  if (targetIndex === -1) {
    throw new Error(`Slot ${targetKode} tidak ditemukan di wilayah.`);
  }

  const targetSlot = slotsWilayah[targetIndex];
  if (targetSlot === undefined) {
    throw new Error(`Slot ${targetKode} tidak ditemukan di wilayah.`);
  }

  const wasAktif = targetSlot.penerimaAktif;

  // Salin list slot
  const updatedSlots: SlotRingkas[] = slotsWilayah.map((s) => {
    if (s.kode === targetKode) {
      return {
        ...s,
        status: 'GUGUR',
        penerimaAktif: false,
      };
    }
    return { ...s };
  });

  let promotedKode: KodeSlotPaket | null = null;

  if (wasAktif) {
    // Cari kandidat berikutnya yang belum gugur (urutan UTAMA -> C1 -> C2)
    const nextCandidate = updatedSlots.find((s) => s.status !== 'GUGUR');
    if (nextCandidate !== undefined) {
      nextCandidate.status = 'MENANG';
      nextCandidate.penerimaAktif = true;
      promotedKode = nextCandidate.kode;
    }
  }

  const statusWilayah = hitungStatusWilayah(updatedSlots);

  return {
    slots: updatedSlots,
    promotedKode,
    statusWilayah,
  };
}
