import { z } from 'zod';

import { PASSWORD_MAKS_PANJANG, PASSWORD_MIN_PANJANG, USERNAME_POLA } from './akun';
import { type Result } from './result';

const PERAN = ['ADMIN', 'OPERATOR'] as const;

const PESAN_USERNAME =
  'Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau strip.';

const PESAN_PASSWORD_PENDEK = `Kata sandi awal minimal ${PASSWORD_MIN_PANJANG.toString()} karakter.`;

const passwordAwal = z
  .string()
  .min(PASSWORD_MIN_PANJANG, PESAN_PASSWORD_PENDEK)
  .max(PASSWORD_MAKS_PANJANG, `Kata sandi maksimal ${PASSWORD_MAKS_PANJANG.toString()} karakter.`);

/** Masukan `POST /api/pengguna` (API.md, Pengguna & Audit). Username dirapikan ke huruf kecil. */
export const BuatPenggunaSchema = z.strictObject({
  username: z.string().trim().toLowerCase().regex(USERNAME_POLA, PESAN_USERNAME),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100, 'Nama maksimal 100 karakter.'),
  peran: z.enum(PERAN, { error: 'Peran harus Admin atau Operator.' }),
  passwordAwal,
});

export type BuatPengguna = z.infer<typeof BuatPenggunaSchema>;

/**
 * Masukan `PATCH /api/pengguna/:id`: tepat satu perubahan per permintaan (aktif, reset kata sandi,
 * atau peran) beserta `version` yang dibaca terakhir (optimistic concurrency, API.md §1).
 */
export const UbahPenggunaSchema = z.union(
  [
    z.strictObject({ version: z.int().min(1), aktif: z.boolean() }),
    z.strictObject({ version: z.int().min(1), resetPassword: passwordAwal }),
    z.strictObject({
      version: z.int().min(1),
      peran: z.enum(PERAN, { error: 'Peran harus Admin atau Operator.' }),
    }),
  ],
  { error: 'Kirim tepat satu perubahan: aktif, resetPassword, atau peran, beserta version.' },
);

export type UbahPengguna = z.infer<typeof UbahPenggunaSchema>;

export type PenggunaUntukAturan = {
  id: string;
  peran: 'ADMIN' | 'OPERATOR';
  aktif: boolean;
};

export type AlasanUbahDitolak = 'UBAH_DIRI_SENDIRI' | 'ADMIN_TERAKHIR';

export const PESAN_UBAH_DITOLAK: Record<AlasanUbahDitolak, string> = {
  UBAH_DIRI_SENDIRI: 'Anda tidak dapat menonaktifkan atau menurunkan peran akun Anda sendiri.',
  ADMIN_TERAKHIR: 'Minimal satu Admin aktif harus tersisa.',
};

/**
 * Aturan perubahan akun (API.md, PRD F11): Admin tidak boleh menonaktifkan atau menurunkan peran
 * dirinya sendiri, dan perubahan tidak boleh menyisakan nol Admin aktif. `jumlahAdminAktif`
 * dihitung di dalam transaksi yang sama dengan perubahannya.
 */
export function periksaUbahPengguna(masukan: {
  aktorId: string;
  target: PenggunaUntukAturan;
  perubahan: { aktif?: boolean; peran?: 'ADMIN' | 'OPERATOR' };
  jumlahAdminAktif: number;
}): Result<true, AlasanUbahDitolak> {
  const { aktorId, target, perubahan, jumlahAdminAktif } = masukan;
  const menonaktifkan = perubahan.aktif === false && target.aktif;
  const menurunkan = perubahan.peran === 'OPERATOR' && target.peran === 'ADMIN';
  if (!menonaktifkan && !menurunkan) {
    return { ok: true, value: true };
  }
  if (target.id === aktorId) {
    return { ok: false, error: 'UBAH_DIRI_SENDIRI' };
  }
  const targetAdminAktif = target.peran === 'ADMIN' && target.aktif;
  if (targetAdminAktif && jumlahAdminAktif <= 1) {
    return { ok: false, error: 'ADMIN_TERAKHIR' };
  }
  return { ok: true, value: true };
}
