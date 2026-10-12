import { BadgeCheck, Ban, Dices, FilePen, Globe, Lock, type LucideIcon } from 'lucide-react';
import { type ReactElement } from 'react';

import { Chip } from '@/components/ui/chip';
import { LABEL_STATUS_PERIODE, type StatusPeriode } from '@/lib/domain';

type Nada = Parameters<typeof Chip>[0]['nada'];

/** Warna dan ikon chip status periode (DESIGN_SYSTEM §12, tabel Chip status). */
const GAYA_STATUS: Record<StatusPeriode, { nada: Nada; Ikon: LucideIcon }> = {
  DRAF: { nada: 'netral', Ikon: FilePen },
  TERKUNCI: { nada: 'primer', Ikon: Lock },
  DIUNDI: { nada: 'primer', Ikon: Dices },
  FINAL: { nada: 'sukses', Ikon: BadgeCheck },
  DIPUBLIKASI: { nada: 'sukses', Ikon: Globe },
  DIBATALKAN: { nada: 'bahaya', Ikon: Ban },
};

export function ChipStatusPeriode({ status }: { status: StatusPeriode }): ReactElement {
  const { nada, Ikon } = GAYA_STATUS[status];
  return (
    <Chip nada={nada} Ikon={Ikon}>
      {LABEL_STATUS_PERIODE[status]}
    </Chip>
  );
}
