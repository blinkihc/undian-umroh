import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { BagianPeriode } from '@/components/admin/periode/bagian-periode';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { daftarPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Dasbor | ${NAMA_APLIKASI}` };

export default async function DasborPage(): Promise<ReactElement> {
  const pengguna = await wajibPeran(['ADMIN']);
  const periode = await daftarPeriode();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-h1 font-bold text-neutral-900">Dasbor</h1>
        <p className="mt-2 text-base text-neutral-600">Selamat datang, {pengguna.nama}.</p>
      </div>
      <BagianPeriode items={periode} />
    </div>
  );
}
