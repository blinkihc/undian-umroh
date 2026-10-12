import { z } from 'zod';

import { type KodeWilayah } from './periode';

/** Masukan `PUT /api/periode/:id/wilayah` (API.md, Wilayah). */
export const PemetaanSchema = z
  .strictObject({
    version: z.int().min(1),
    pemetaan: z
      .array(
        z.strictObject({
          kecamatan: z.string().min(1).max(100),
          wilayah: z.enum(['W1', 'W2'], { error: 'Wilayah harus W1, W2, atau null.' }).nullable(),
        }),
      )
      .min(1, 'Kirim minimal satu pemetaan.')
      .max(1000, 'Pemetaan maksimal 1.000 kecamatan.'),
  })
  .refine((isi) => new Set(isi.pemetaan.map((p) => p.kecamatan)).size === isi.pemetaan.length, {
    message: 'Kecamatan tidak boleh muncul dua kali.',
    path: ['pemetaan'],
  });

export type Pemetaan = z.infer<typeof PemetaanSchema>;

/** Bentuk ringkas untuk pembanding: tanpa spasi dan tanda baca. */
function ringkas(nama: string): string {
  return nama.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Jarak Levenshtein dengan batas: berhenti lebih awal bila pasti melebihi `batas`. */
function jarakSunting(a: string, b: string, batas: number): number {
  if (Math.abs(a.length - b.length) > batas) return batas + 1;
  let sebelumnya = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const sekarang = [i];
    let minimum = i;
    for (let j = 1; j <= b.length; j += 1) {
      const nilai = Math.min(
        (sebelumnya[j] ?? 0) + 1,
        (sekarang[j - 1] ?? 0) + 1,
        (sebelumnya[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      sekarang.push(nilai);
      minimum = Math.min(minimum, nilai);
    }
    if (minimum > batas) return batas + 1;
    sebelumnya = sekarang;
  }
  return sebelumnya[b.length] ?? batas + 1;
}

/**
 * Saran "Mungkin sama dengan …" (UX_FLOWS Flow 4): dua kecamatan dianggap mirip bila sama setelah
 * spasi dan tanda baca dibuang (`MUARA DUA KISAM` ~ `MUARADUA KISAM`), atau berbeda satu huruf
 * untuk nama minimal 6 huruf. Hanya saran; admin tetap memetakan masing-masing.
 */
export function cariKecamatanMirip(daftar: readonly string[]): Map<string, string[]> {
  const bentuk = daftar.map((nama) => ({ nama, r: ringkas(nama) }));
  const hasil = new Map<string, string[]>(daftar.map((nama) => [nama, []]));
  for (let i = 0; i < bentuk.length; i += 1) {
    for (let j = i + 1; j < bentuk.length; j += 1) {
      const a = bentuk[i];
      const b = bentuk[j];
      if (a === undefined || b === undefined) continue;
      const mirip =
        a.r === b.r || (Math.min(a.r.length, b.r.length) >= 6 && jarakSunting(a.r, b.r, 1) <= 1);
      if (mirip) {
        hasil.get(a.nama)?.push(b.nama);
        hasil.get(b.nama)?.push(a.nama);
      }
    }
  }
  return hasil;
}

export type BarisPemetaan = { kecamatan: string; wilayah: KodeWilayah | null; jumlahLolos: number };

export type RingkasanWilayah = {
  W1: { jumlahKecamatan: number; jumlahLolos: number };
  W2: { jumlahKecamatan: number; jumlahLolos: number };
  BELUM_DIPETAKAN: { jumlahKecamatan: number; jumlahLolos: number };
};

/** Jumlah kecamatan dan peserta lolos per wilayah, termasuk yang belum dipetakan. */
export function hitungRingkasanWilayah(baris: readonly BarisPemetaan[]): RingkasanWilayah {
  const hasil: RingkasanWilayah = {
    W1: { jumlahKecamatan: 0, jumlahLolos: 0 },
    W2: { jumlahKecamatan: 0, jumlahLolos: 0 },
    BELUM_DIPETAKAN: { jumlahKecamatan: 0, jumlahLolos: 0 },
  };
  for (const b of baris) {
    const tujuan = hasil[b.wilayah ?? 'BELUM_DIPETAKAN'];
    tujuan.jumlahKecamatan += 1;
    tujuan.jumlahLolos += b.jumlahLolos;
  }
  return hasil;
}

/**
 * Urutan tampil tabel pemetaan: belum dipetakan paling atas (memblokir kunci), lalu menurut
 * abjad.
 */
export function urutkanPemetaan<T extends { kecamatan: string; wilayah: KodeWilayah | null }>(
  baris: readonly T[],
): T[] {
  return [...baris].sort((a, b) => {
    const belumA = a.wilayah === null ? 0 : 1;
    const belumB = b.wilayah === null ? 0 : 1;
    return belumA - belumB || a.kecamatan.localeCompare(b.kecamatan);
  });
}
