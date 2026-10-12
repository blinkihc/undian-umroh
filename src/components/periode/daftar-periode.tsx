import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { type ReactElement } from 'react';

import { TautanTombol } from '@/components/ui/tautan-tombol';
import { formatTanggal, formatWaktuWib, type StatusPeriode } from '@/lib/domain';

import { ChipStatusPeriode } from './chip-status-periode';

export type PeriodeTampil = {
  id: string;
  judul: string;
  status: StatusPeriode;
  batasLunas: string;
  tanggalAcara: string | null;
  lokasiAcara: string | null;
};

type DaftarPeriodeProps = {
  items: readonly PeriodeTampil[];
  /** Awalan tautan detail, mis. `/admin/periode` atau `/operator/periode`. */
  awalanDetail: string;
  /** Tautan "Buat Periode" di keadaan kosong; tidak diisi untuk Operator. */
  hrefBuat?: string;
};

const KOLOM = ['Judul', 'Status', 'Batas lunas', 'Tanggal acara', 'Lokasi acara'] as const;

/** Daftar periode dengan chip status (UX_FLOWS Flow 2); keadaan kosong sesuai DESIGN_SYSTEM §12. */
export function DaftarPeriode({ items, awalanDetail, hrefBuat }: DaftarPeriodeProps): ReactElement {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-neutral-300 bg-neutral-0 px-6 py-12 text-center shadow-sm">
        <CalendarPlus aria-hidden="true" className="size-12 text-neutral-600" strokeWidth={1.75} />
        <p className="text-base font-semibold text-neutral-900">Belum ada periode undian.</p>
        <p className="text-sm text-neutral-600">
          Periode menampung data peserta, pemetaan wilayah, dan hasil undian.
        </p>
        {hrefBuat !== undefined && <TautanTombol href={hrefBuat}>Buat Periode</TautanTombol>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-300 bg-neutral-0 shadow-sm">
      <table className="w-full min-w-[880px] text-left text-sm">
        <caption className="sr-only">Daftar periode undian</caption>
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            {KOLOM.map((kolom) => (
              <th key={kolom} scope="col" className="px-4 py-3 font-semibold">
                {kolom}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-t border-neutral-300 align-top">
              <td className="px-4 py-3 text-base font-medium">
                <Link
                  href={`${awalanDetail}/${p.id}`}
                  className="text-primary-700 underline-offset-2 hover:underline"
                >
                  {p.judul}
                </Link>
              </td>
              <td className="px-4 py-3">
                <ChipStatusPeriode status={p.status} />
              </td>
              <td className="angka-tabular px-4 py-3 whitespace-nowrap text-neutral-900">
                {formatWaktuWib(new Date(p.batasLunas))}
              </td>
              <td className="angka-tabular px-4 py-3 text-neutral-900">
                {p.tanggalAcara === null ? 'Belum ditentukan' : formatTanggal(p.tanggalAcara)}
              </td>
              <td className="px-4 py-3 text-neutral-900">{p.lokasiAcara ?? 'Belum ditentukan'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
