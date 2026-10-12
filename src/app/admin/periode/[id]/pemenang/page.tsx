import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';

import { KelolaPemenang } from '@/components/admin/pemenang/kelola-pemenang';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { cariPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Pemenang | ${NAMA_APLIKASI}` };

type HalamanProps = { params: Promise<{ id: string }> };

export default async function HalamanPemenangAdmin({
  params,
}: HalamanProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const { id } = await params;
  const periode = await cariPeriode(id);

  if (periode === null) {
    notFound();
  }

  return <KelolaPemenang periodeId={periode.id} statusPeriode={periode.status} />;
}
