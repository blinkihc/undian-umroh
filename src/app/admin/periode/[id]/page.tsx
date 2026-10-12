import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';

import { BatalPeriode } from '@/components/admin/periode/batal-periode';
import { FormPeriode } from '@/components/admin/periode/form-periode';
import { RingkasanPeriode } from '@/components/periode/ringkasan-periode';
import { NAMA_APLIKASI } from '@/config/brand';
import { periksaBatalPeriode, periksaUbahPeriode } from '@/lib/domain';
import { wajibPeran } from '@/server/auth/halaman';
import { cariPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Pengaturan Periode | ${NAMA_APLIKASI}` };

type HalamanPeriodeProps = { params: Promise<{ id: string }> };

/** Tab Pengaturan periode untuk Admin: ringkasan, ubah pengaturan, dan batalkan. */
export default async function HalamanPeriodeAdmin({
  params,
}: HalamanPeriodeProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const periode = await cariPeriode((await params).id);
  if (periode === null) {
    notFound();
  }
  const bolehUbah = periksaUbahPeriode(periode.status, {}).ok;
  const bolehBatal = periksaBatalPeriode(periode.status).ok;

  return (
    <div className="max-w-[880px] space-y-6">
      <RingkasanPeriode periode={periode} />
      {bolehUbah && <FormPeriode mode="ubah" periode={periode} />}
      {bolehBatal && <BatalPeriode id={periode.id} version={periode.version} />}
    </div>
  );
}
