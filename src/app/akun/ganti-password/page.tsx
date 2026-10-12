import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { FormGantiPassword } from '@/components/akun/form-ganti-password';
import { KartuAutentikasi } from '@/components/akun/kartu-autentikasi';
import { NAMA_APLIKASI } from '@/config/brand';
import { berandaPeran } from '@/lib/domain';
import { wajibMasuk } from '@/server/auth/halaman';

export const metadata: Metadata = { title: `Ganti kata sandi | ${NAMA_APLIKASI}` };

export default async function GantiPasswordPage(): Promise<ReactElement> {
  // Satu-satunya halaman yang boleh dibuka akun wajib-ganti kata sandi.
  const pengguna = await wajibMasuk({ izinkanGantiPassword: true });

  return (
    <KartuAutentikasi
      judul="Ganti kata sandi"
      deskripsi={
        pengguna.mustChangePassword
          ? 'Kata sandi sementara harus diganti sebelum Anda dapat memakai aplikasi.'
          : 'Masukkan kata sandi lama, lalu pilih kata sandi baru.'
      }
    >
      <FormGantiPassword
        username={pengguna.username}
        wajib={pengguna.mustChangePassword}
        beranda={berandaPeran(pengguna.peran)}
      />
    </KartuAutentikasi>
  );
}
