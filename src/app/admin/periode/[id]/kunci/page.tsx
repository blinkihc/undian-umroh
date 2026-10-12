import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { KunciData } from '@/components/admin/kunci/kunci-data';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { ambilPrasyaratKunci } from '@/server/services/kunci';

export const metadata: Metadata = { title: `Kunci Data | ${NAMA_APLIKASI}` };

type HalamanKunciProps = { params: Promise<{ id: string }> };

export default async function HalamanKunci({ params }: HalamanKunciProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const { id } = await params;
  const prasyarat = await ambilPrasyaratKunci(id);

  return <KunciData periodeId={id} prasyarat={prasyarat} />;
}
