import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { type Peran } from '@/generated/prisma/client';
import { berandaPeran } from '@/lib/domain';

import { ambilPenggunaDariHeaders, type OpsiAkses, type PenggunaSesi } from './sesi';

/** Pengguna untuk Server Component, dibaca dari cookie request yang sedang berjalan. */
export async function penggunaSaatIni(): Promise<PenggunaSesi | null> {
  return ambilPenggunaDariHeaders(await headers());
}

/**
 * Penjaga halaman: tanpa sesi ke /login; akun wajib-ganti kata sandi ke halaman ganti kata sandi
 * (SECURITY §1). Panggil di setiap halaman, bukan hanya di layout, karena layout tidak
 * dirender ulang pada navigasi antarhalaman.
 */
export async function wajibMasuk(opsi: OpsiAkses = {}): Promise<PenggunaSesi> {
  const pengguna = await penggunaSaatIni();
  if (pengguna === null) {
    redirect('/login');
  }
  if (pengguna.mustChangePassword && opsi.izinkanGantiPassword !== true) {
    redirect('/akun/ganti-password');
  }
  return pengguna;
}

/** Penjaga halaman berdasarkan peran; peran lain diarahkan ke berandanya dengan pesan penolakan. */
export async function wajibPeran(peran: readonly Peran[]): Promise<PenggunaSesi> {
  const pengguna = await wajibMasuk();
  if (!peran.includes(pengguna.peran)) {
    redirect(`${berandaPeran(pengguna.peran)}?ditolak=1`);
  }
  return pengguna;
}
