import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { TampilanPemenangPublik } from '@/components/publik/pemenang/tampilan-pemenang';
import { NAMA_APLIKASI } from '@/config/brand';
import { ambilPemenangPublik } from '@/server/services/pemenang';

export const metadata: Metadata = {
  title: `Pengumuman Pemenang | ${NAMA_APLIKASI}`,
  description:
    'Pengumuman resmi pemenang dan cadangan undian umroh gratis bagi wajib pajak PBB-P2 Kabupaten OKU Selatan.',
};

export const dynamic = 'force-dynamic';

export default async function HalamanPemenangPublik(): Promise<ReactElement> {
  const data = await ambilPemenangPublik();
  return <TampilanPemenangPublik data={data} />;
}
