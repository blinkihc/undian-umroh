import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';

import { FormBeritaAcara } from '@/components/admin/berita-acara/form-berita-acara';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { cariPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Berita Acara | ${NAMA_APLIKASI}` };

type HalamanProps = { params: Promise<{ id: string }> };

export default async function HalamanBeritaAcaraAdmin({
  params,
}: HalamanProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const { id } = await params;
  const periode = await cariPeriode(id);

  if (periode === null) {
    notFound();
  }

  return <FormBeritaAcara periodeId={periode.id} statusPeriode={periode.status} />;
}
