import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { BagianPeriode } from '@/components/admin/periode/bagian-periode';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { daftarPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Periode Undian | ${NAMA_APLIKASI}` };

export default async function DaftarPeriodePage(): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  return <BagianPeriode items={await daftarPeriode()} judulUtama />;
}
