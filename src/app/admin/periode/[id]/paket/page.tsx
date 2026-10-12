import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { PaketUndian } from '@/components/admin/paket/paket-undian';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { ambilInfoPaket } from '@/server/services/paket';

export const metadata: Metadata = { title: `Paket Undian | ${NAMA_APLIKASI}` };

type HalamanPaketProps = { params: Promise<{ id: string }> };

export default async function HalamanPaket({ params }: HalamanPaketProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const { id } = await params;
  const info = await ambilInfoPaket(id);

  return <PaketUndian periodeId={id} info={info} />;
}
