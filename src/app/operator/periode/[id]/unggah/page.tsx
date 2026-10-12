import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';

import { UnggahHasil } from '@/components/admin/hasil/unggah-hasil';
import { KepalaPeriode } from '@/components/periode/kepala-periode';
import { TautanTombol } from '@/components/ui/tautan-tombol';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { cariPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Unggah Hasil | ${NAMA_APLIKASI}` };

type HalamanProps = { params: Promise<{ id: string }> };

export default async function HalamanUnggahHasilOperator({
  params,
}: HalamanProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN', 'OPERATOR']);
  const { id } = await params;
  const periode = await cariPeriode(id);

  if (periode === null) {
    notFound();
  }

  return (
    <div className="max-w-[880px] space-y-6">
      <KepalaPeriode periode={periode} />
      <UnggahHasil periodeId={periode.id} statusPeriode={periode.status} isAdmin={false} />
      <div>
        <TautanTombol href="/operator" varian="secondary">
          Kembali ke Dasbor Operator
        </TautanTombol>
      </div>
    </div>
  );
}
