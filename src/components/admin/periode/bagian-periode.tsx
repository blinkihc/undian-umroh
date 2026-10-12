import { type ReactElement } from 'react';

import { DaftarPeriode, type PeriodeTampil } from '@/components/periode/daftar-periode';
import { TautanTombol } from '@/components/ui/tautan-tombol';
import { isPeriodeAktif } from '@/lib/domain';

type BagianPeriodeProps = {
  items: readonly PeriodeTampil[];
  /** Level judul bagian: h1 di halaman Periode, h2 di Dasbor. */
  judulUtama?: boolean;
};

/**
 * Daftar periode untuk Admin beserta tombol "Buat Periode". Selama masih ada periode aktif,
 * tombol diganti keterangan alasannya (DESIGN_SYSTEM §12 Disabled: selalu sertakan alasan).
 */
export function BagianPeriode({ items, judulUtama = false }: BagianPeriodeProps): ReactElement {
  const aktif = items.find((p) => isPeriodeAktif(p.status));
  const Judul = judulUtama ? 'h1' : 'h2';
  return (
    <section aria-labelledby="judul-daftar-periode" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Judul
          id="judul-daftar-periode"
          className={`font-heading text-neutral-900 ${
            judulUtama ? 'text-h1 font-bold' : 'text-h2 font-semibold'
          }`}
        >
          Periode Undian
        </Judul>
        {items.length > 0 && aktif === undefined && (
          <TautanTombol href="/admin/periode/baru">Buat Periode</TautanTombol>
        )}
      </div>
      {aktif !== undefined && (
        <p className="text-sm text-neutral-600">
          Periode baru dapat dibuat setelah periode aktif ({aktif.judul}) dipublikasikan atau
          dibatalkan.
        </p>
      )}
      <DaftarPeriode items={items} awalanDetail="/admin/periode" hrefBuat="/admin/periode/baru" />
    </section>
  );
}
