import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { KelolaTemaAdmin } from '@/components/admin/tema/kelola-tema';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';

export const metadata: Metadata = {
  title: `Tema Undian | ${NAMA_APLIKASI}`,
  description: 'Pengaturan tema animasi, visual, dan suara Layar Undian Bapenda OKU Selatan',
};

export default async function HalamanTemaAdmin(): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);

  return (
    <div className="p-6 md:p-8">
      <KelolaTemaAdmin />
    </div>
  );
}
