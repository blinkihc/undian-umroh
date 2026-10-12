import { MapPinned } from 'lucide-react';
import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { PemetaanWilayah } from '@/components/admin/wilayah/pemetaan-wilayah';
import { TautanTombol } from '@/components/ui/tautan-tombol';
import { NAMA_APLIKASI } from '@/config/brand';
import { periksaUbahPeriode } from '@/lib/domain';
import { wajibPeran } from '@/server/auth/halaman';
import { ambilPemetaan } from '@/server/services/wilayah';

export const metadata: Metadata = { title: `Wilayah | ${NAMA_APLIKASI}` };

type HalamanWilayahProps = { params: Promise<{ id: string }> };

/** Tab Wilayah (UX_FLOWS Flow 4). Periode tidak ada ditangani layout (404). */
export default async function HalamanWilayah({
  params,
}: HalamanWilayahProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const { id } = await params;
  const data = await ambilPemetaan(id);

  if (data.kecamatan.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-neutral-300 bg-neutral-0 px-6 py-12 text-center shadow-sm">
        <MapPinned aria-hidden="true" className="size-12 text-neutral-600" strokeWidth={1.75} />
        <p className="text-base font-semibold text-neutral-900">
          Unggah data peserta terlebih dahulu.
        </p>
        <p className="text-sm text-neutral-600">
          Daftar kecamatan dibuat otomatis dari data impor.
        </p>
        <TautanTombol href={`/admin/periode/${id}/peserta`}>Buka Data Peserta</TautanTombol>
      </div>
    );
  }

  return (
    <PemetaanWilayah
      periodeId={id}
      version={data.version}
      bolehUbah={data.status === 'DRAF'}
      bolehUbahNama={periksaUbahPeriode(data.status, {}).ok}
      wilayah={data.wilayah}
      kecamatan={data.kecamatan}
    />
  );
}
