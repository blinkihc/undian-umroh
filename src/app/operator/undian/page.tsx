import { type Metadata } from 'next';
import { Suspense, type ReactElement } from 'react';

import { LayarUndian } from '@/components/undian/layar-undian';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';

export const metadata: Metadata = {
  title: `Layar Undian | ${NAMA_APLIKASI}`,
  description: 'Layar undian utama offline untuk laptop acara Bapenda OKU Selatan',
};

export default async function HalamanUndian(): Promise<ReactElement> {
  await wajibPeran(['ADMIN', 'OPERATOR']);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-900 text-neutral-100">
          <p className="text-lg font-semibold">Memuat Layar Undian...</p>
        </div>
      }
    >
      <LayarUndian />
    </Suspense>
  );
}
