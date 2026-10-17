import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';

import { KepalaPeriode } from '@/components/periode/kepala-periode';
import { RingkasanPeriode } from '@/components/periode/ringkasan-periode';
import { TautanTombol } from '@/components/ui/tautan-tombol';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { cariPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Periode | ${NAMA_APLIKASI}` };

type HalamanPeriodeProps = { params: Promise<{ id: string }> };

/** Detail periode baca-saja untuk Operator (tanpa data peserta, SECURITY §2). */
export default async function HalamanPeriodeOperator({
  params,
}: HalamanPeriodeProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN', 'OPERATOR']);
  const periode = await cariPeriode((await params).id);
  if (periode === null) {
    notFound();
  }
  return (
    <div className="max-w-[880px] space-y-6">
      <KepalaPeriode periode={periode} />
      <RingkasanPeriode periode={periode} />
      <TautanTombol href="/operator" varian="secondary">
        Kembali
      </TautanTombol>
    </div>
  );
}
