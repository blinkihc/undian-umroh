import { notFound } from 'next/navigation';
import { type ReactElement, type ReactNode } from 'react';

import { TabPeriode } from '@/components/admin/periode/tab-periode';
import { KepalaPeriode } from '@/components/periode/kepala-periode';
import { wajibPeran } from '@/server/auth/halaman';
import { cariPeriode } from '@/server/services/periode';

type LayoutPeriodeProps = { children: ReactNode; params: Promise<{ id: string }> };

/** Kerangka halaman periode Admin: judul + status, lalu tab. Halaman tetap memeriksa peran. */
export default async function LayoutPeriodeAdmin({
  children,
  params,
}: LayoutPeriodeProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const periode = await cariPeriode((await params).id);
  if (periode === null) {
    notFound();
  }
  return (
    <div className="max-w-[1120px] space-y-6">
      <KepalaPeriode periode={periode} />
      <TabPeriode id={periode.id} />
      {children}
    </div>
  );
}
