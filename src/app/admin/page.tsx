import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { Alert } from '@/components/ui/alert';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';

export const metadata: Metadata = { title: `Dasbor | ${NAMA_APLIKASI}` };

export default async function DasborPage(): Promise<ReactElement> {
  const pengguna = await wajibPeran(['ADMIN']);

  return (
    <section>
      <h1 className="font-heading text-h1 font-bold text-neutral-900">Dasbor</h1>
      <p className="mt-2 text-base text-neutral-600">Selamat datang, {pengguna.nama}.</p>
      <div className="mt-8 max-w-[720px]">
        <Alert jenis="info" judul="Dasbor sedang disiapkan">
          Daftar periode undian, impor data, dan pengaturan lain akan tersedia di sini secara
          bertahap.
        </Alert>
      </div>
    </section>
  );
}
