import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { KelolaPengguna } from '@/components/admin/pengguna/kelola-pengguna';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { daftarPengguna } from '@/server/services/pengguna';

export const metadata: Metadata = { title: `Pengguna | ${NAMA_APLIKASI}` };

export default async function PenggunaPage(): Promise<ReactElement> {
  const admin = await wajibPeran(['ADMIN']);
  const akun = await daftarPengguna();
  return <KelolaPengguna akun={akun} idSaya={admin.id} />;
}
