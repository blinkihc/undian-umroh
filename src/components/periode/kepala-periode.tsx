import { type ReactElement } from 'react';

import { Alert } from '@/components/ui/alert';
import { type StatusPeriode } from '@/lib/domain';

import { ChipStatusPeriode } from './chip-status-periode';

type KepalaPeriodeProps = {
  periode: { judul: string; status: StatusPeriode; alasanBatal: string | null };
};

/** Judul periode, chip status, dan banner alasan bila dibatalkan (semua halaman periode). */
export function KepalaPeriode({ periode }: KepalaPeriodeProps): ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-h1 font-bold text-neutral-900">{periode.judul}</h1>
        <ChipStatusPeriode status={periode.status} />
      </div>
      {periode.status === 'DIBATALKAN' && (
        <Alert jenis="galat" judul="Periode ini dibatalkan.">
          {`Alasan: ${periode.alasanBatal ?? '-'}`}
        </Alert>
      )}
    </div>
  );
}
