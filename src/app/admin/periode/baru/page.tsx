import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { FormPeriode } from '@/components/admin/periode/form-periode';
import { Alert } from '@/components/ui/alert';
import { TautanTombol } from '@/components/ui/tautan-tombol';
import { NAMA_APLIKASI } from '@/config/brand';
import { isPeriodeAktif } from '@/lib/domain';
import { wajibPeran } from '@/server/auth/halaman';
import { daftarPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Buat Periode | ${NAMA_APLIKASI}` };

/** Buat Periode Undian (UX_FLOWS Flow 2). */
export default async function BuatPeriodePage(): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const aktif = (await daftarPeriode()).find((p) => isPeriodeAktif(p.status));

  return (
    <div className="max-w-[880px] space-y-6">
      <h1 className="font-heading text-h1 font-bold text-neutral-900">Buat Periode Undian</h1>
      {aktif === undefined ? (
        <FormPeriode mode="buat" />
      ) : (
        <div className="space-y-4">
          <Alert
            jenis="peringatan"
            judul={`Masih ada periode aktif: ${aktif.judul}. Publikasikan atau batalkan periode tersebut dulu.`}
          />
          <TautanTombol href={`/admin/periode/${aktif.id}`} varian="secondary">
            Buka Periode Aktif
          </TautanTombol>
        </div>
      )}
    </div>
  );
}
