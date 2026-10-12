import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { DaftarPeriode } from '@/components/periode/daftar-periode';
import { Alert } from '@/components/ui/alert';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { daftarPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Operator | ${NAMA_APLIKASI}` };

type OperatorPageProps = {
  searchParams: Promise<{ ditolak?: string }>;
};

export default async function OperatorPage({
  searchParams,
}: OperatorPageProps): Promise<ReactElement> {
  const pengguna = await wajibPeran(['ADMIN', 'OPERATOR']);
  const { ditolak } = await searchParams;
  const periode = await daftarPeriode();

  return (
    <div className="space-y-8">
      <section className="max-w-[720px] space-y-6">
        <div>
          <h1 className="font-heading text-h1 font-bold text-neutral-900">Operator</h1>
          <p className="mt-2 text-base text-neutral-600">Selamat datang, {pengguna.nama}.</p>
        </div>
        {ditolak === '1' && (
          <Alert jenis="peringatan" judul="Anda tidak memiliki akses ke halaman ini." />
        )}
        <Alert jenis="info" judul="Halaman operator sedang disiapkan">
          Layar Undian dan unggah hasil akan tersedia di sini secara bertahap.
        </Alert>
      </section>
      <section aria-labelledby="judul-periode-operator" className="space-y-4">
        <h2
          id="judul-periode-operator"
          className="font-heading text-h2 font-semibold text-neutral-900"
        >
          Periode Undian
        </h2>
        <DaftarPeriode items={periode} awalanDetail="/operator/periode" />
      </section>
    </div>
  );
}
