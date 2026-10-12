import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { type ReactElement } from 'react';

import { FormLogin } from '@/components/akun/form-login';
import { KartuAutentikasi } from '@/components/akun/kartu-autentikasi';
import { NAMA_APLIKASI } from '@/config/brand';
import { berandaPeran, bolehAkses, jalurInternalAman } from '@/lib/domain';
import { penggunaSaatIni } from '@/server/auth/halaman';

export const metadata: Metadata = { title: `Masuk | ${NAMA_APLIKASI}` };

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps): Promise<ReactElement> {
  const { callbackUrl } = await searchParams;
  const tujuan = jalurInternalAman(typeof callbackUrl === 'string' ? callbackUrl : null);

  // Sudah punya sesi: tidak perlu mengisi form lagi. Tujuan hanya dipakai bila peran boleh membukanya.
  const pengguna = await penggunaSaatIni();
  if (pengguna !== null) {
    if (pengguna.mustChangePassword) {
      redirect('/akun/ganti-password');
    }
    redirect(
      tujuan !== null && bolehAkses(pengguna.peran, tujuan) ? tujuan : berandaPeran(pengguna.peran),
    );
  }

  return (
    <KartuAutentikasi
      judul="Masuk"
      deskripsi={`Panel Admin dan Operator ${NAMA_APLIKASI}. Gunakan akun yang diberikan Bapenda.`}
    >
      <FormLogin callbackUrl={tujuan} />
    </KartuAutentikasi>
  );
}
