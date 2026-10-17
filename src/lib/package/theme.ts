import { z } from 'zod';

/**
 * Skema konfigurasi tema Layar Undian (API.md §5, DECISIONS 010).
 * Bersifat murni dan dipakai bersama server dan browser.
 */
export const ThemeConfigSchema = z
  .object({
    versiFormat: z.literal(1),
    animasi: z
      .object({
        preset: z.enum(['slot-mesin', 'roda-nama', 'kartu-berputar', 'ticker-nop']),
        durasiDetik: z.number().int().min(3).max(30),
        autoStop: z.boolean(),
        kecepatan: z.enum(['lambat', 'sedang', 'cepat']),
        perlambatanDetik: z.number().int().min(1).max(3),
      })
      .strict(),
    tampilan: z
      .object({
        latarAsetId: z.string().nullable(),
        overlayGelapPersen: z.number().int().min(60).max(90),
        ornamenIslami: z.boolean(),
        warnaAksen: z.enum(['kuning', 'hijau', 'biru-muda']),
        confetti: z.boolean(),
      })
      .strict(),
    audio: z
      .object({
        menunggu: z
          .object({
            asetId: z.string().nullable(),
            volumePersen: z.number().int().min(0).max(100),
            loop: z.literal(true),
            preset: z.string().default('bawaan'),
          })
          .strict(),
        mengacak: z
          .object({
            asetId: z.string().nullable(),
            volumePersen: z.number().int().min(0).max(100),
            loop: z.boolean(),
            preset: z.string().default('bawaan'),
          })
          .strict(),
        pemenang: z
          .object({
            asetId: z.string().nullable(),
            volumePersen: z.number().int().min(0).max(100),
            loop: z.literal(false),
            preset: z.string().default('bawaan'),
          })
          .strict(),
      })
      .strict(),
    teks: z
      .object({
        judulAtas: z.string().max(120).default('GEBYAR UNDIAN UMROH PBB-P2'),
        ucapanPemenang: z.string().min(3).max(80),
        subjudul: z.string().max(120).nullable(),
      })
      .strict(),
  })
  .strict();

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

/** Konfigurasi tema default bawaan aplikasi */
export const TEMA_DEFAULT: ThemeConfig = {
  versiFormat: 1,
  animasi: {
    preset: 'slot-mesin',
    durasiDetik: 5,
    autoStop: false,
    kecepatan: 'sedang',
    perlambatanDetik: 2,
  },
  tampilan: {
    latarAsetId: null,
    overlayGelapPersen: 70,
    ornamenIslami: true,
    warnaAksen: 'kuning',
    confetti: true,
  },
  audio: {
    menunggu: { asetId: null, volumePersen: 40, loop: true, preset: 'bawaan' },
    mengacak: { asetId: null, volumePersen: 70, loop: true, preset: 'bawaan' },
    pemenang: { asetId: null, volumePersen: 90, loop: false, preset: 'bawaan' },
  },
  teks: {
    judulAtas: 'GEBYAR UNDIAN UMROH PBB-P2',
    ucapanPemenang: 'Selamat kepada Pemenang Umroh',
    subjudul: 'Pajak Daerah untuk Pembangunan OKU Selatan',
  },
};
