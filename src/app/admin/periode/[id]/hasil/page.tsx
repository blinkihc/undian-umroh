import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';

import { UnggahHasil } from '@/components/admin/hasil/unggah-hasil';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { cariPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Unggah Hasil | ${NAMA_APLIKASI}` };

type HalamanProps = { params: Promise<{ id: string }> };

export default async function HalamanHasilAdmin({ params }: HalamanProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const { id } = await params;
  const periode = await cariPeriode(id);

  if (periode === null) {
    notFound();
  }

  return <UnggahHasil periodeId={periode.id} statusPeriode={periode.status} isAdmin={true} />;
}
