import { z } from 'zod';

import { type Result } from './result';

/** Username: huruf kecil, 3-32 karakter (DATABASE.md, tabel pengguna). */
export const USERNAME_POLA = /^[a-z0-9._-]{3,32}$/;

/** SECURITY §1: minimal 12 karakter, tanpa aturan komposisi. */
export const PASSWORD_MIN_PANJANG = 12;

/** Batas atas masukan agar permintaan tidak membengkak (SECURITY §5). */
export const PASSWORD_MAKS_PANJANG = 128;

/** Satu-satunya pesan untuk kredensial salah, akun nonaktif, maupun akun tak dikenal (SECURITY §1). */
export const PESAN_LOGIN_GAGAL = 'Username atau kata sandi salah.';

export const PESAN_LOGIN_DIBLOKIR = 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.';

/** Masukan login. Sengaja tidak memeriksa pola username agar pesan gagal selalu sama. */
export const LoginSchema = z.strictObject({
  username: z.string().trim().toLowerCase().min(1, 'Username wajib diisi.').max(64),
  password: z.string().min(1, 'Kata sandi wajib diisi.').max(PASSWORD_MAKS_PANJANG),
});

export type Login = z.infer<typeof LoginSchema>;

/** Bentuk masukan ganti kata sandi; aturan yang butuh konteks ada di `periksaPasswordBaru`. */
export const GantiPasswordSchema = z.strictObject({
  passwordLama: z.string().min(1, 'Kata sandi lama wajib diisi.').max(PASSWORD_MAKS_PANJANG),
  passwordBaru: z
    .string()
    .min(
      PASSWORD_MIN_PANJANG,
      `Kata sandi baru minimal ${PASSWORD_MIN_PANJANG.toString()} karakter.`,
    )
    .max(
      PASSWORD_MAKS_PANJANG,
      `Kata sandi baru maksimal ${PASSWORD_MAKS_PANJANG.toString()} karakter.`,
    ),
});

export type GantiPassword = z.infer<typeof GantiPasswordSchema>;

export type PeranPengguna = 'ADMIN' | 'OPERATOR';

/** Beranda tiap peran setelah login (UX_FLOWS Flow 1). */
export function berandaPeran(peran: PeranPengguna): '/admin' | '/operator' {
  return peran === 'ADMIN' ? '/admin' : '/operator';
}

/**
 * Jalur tujuan setelah login yang aman dari open redirect: hanya jalur internal satu garis miring.
 * Mengembalikan null untuk URL luar, protokol-relatif (`//`, `/\`), karakter kontrol (peramban
 * membuang tab dan baris baru sehingga `/\t/host` menjadi `//host`), serta halaman login dan API.
 */
export function jalurInternalAman(nilai: string | null | undefined): string | null {
  if (typeof nilai !== 'string' || !nilai.startsWith('/') || nilai.startsWith('//')) {
    return null;
  }
  for (let i = 0; i < nilai.length; i++) {
    const kode = nilai.charCodeAt(i);
    if (kode < 0x20 || kode === 0x7f || kode === 0x5c) {
      return null;
    }
  }
  return /^\/(login|api)(\/|\?|$)/.test(nilai) ? null : nilai;
}

/** Admin boleh membuka semua halaman; Operator hanya area operator dan akunnya sendiri. */
export function bolehAkses(peran: PeranPengguna, jalur: string): boolean {
  if (peran === 'ADMIN') {
    return true;
  }
  return /^\/(operator|akun)(\/|\?|$)/.test(jalur);
}

export type AlasanPasswordDitolak = 'TERLALU_PENDEK' | 'SAMA_DENGAN_USERNAME' | 'SAMA_DENGAN_LAMA';

export const PESAN_PASSWORD_DITOLAK: Record<AlasanPasswordDitolak, string> = {
  TERLALU_PENDEK: `Kata sandi baru minimal ${PASSWORD_MIN_PANJANG.toString()} karakter.`,
  SAMA_DENGAN_USERNAME: 'Kata sandi tidak boleh sama dengan username.',
  SAMA_DENGAN_LAMA: 'Kata sandi baru harus berbeda dari kata sandi lama.',
};

/**
 * Aturan kata sandi baru (SECURITY §1): minimal 12 karakter dan tidak sama dengan username.
 * Tambahan proyek: tidak boleh sama dengan kata sandi lama, supaya kewajiban ganti kata sandi
 * pertama tidak dapat dilewati dengan memasukkan ulang kata sandi sementara.
 */
export function periksaPasswordBaru(masukan: {
  passwordBaru: string;
  username: string;
  passwordLama?: string;
}): Result<true, AlasanPasswordDitolak> {
  const { passwordBaru, username, passwordLama } = masukan;
  if (passwordBaru.length < PASSWORD_MIN_PANJANG) {
    return { ok: false, error: 'TERLALU_PENDEK' };
  }
  if (passwordBaru.toLowerCase() === username.toLowerCase()) {
    return { ok: false, error: 'SAMA_DENGAN_USERNAME' };
  }
  if (passwordLama !== undefined && passwordBaru === passwordLama) {
    return { ok: false, error: 'SAMA_DENGAN_LAMA' };
  }
  return { ok: true, value: true };
}
