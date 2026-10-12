import { type LucideIcon } from 'lucide-react';
import { type ReactElement } from 'react';

type Nada = 'netral' | 'primer' | 'sukses' | 'peringatan' | 'bahaya';

const GAYA: Record<Nada, string> = {
  netral: 'bg-neutral-50 text-neutral-600 border border-neutral-300',
  primer: 'bg-primary-100 text-primary-700',
  sukses: 'bg-secondary-100 text-success-700',
  peringatan: 'bg-warning-100 text-warning-700',
  bahaya: 'bg-danger-100 text-danger-700',
};

type ChipProps = { nada: Nada; Ikon: LucideIcon; children: string };

/** Chip status berikon dan berteks, tidak hanya warna (DESIGN_SYSTEM §12). */
export function Chip({ nada, Ikon, children }: ChipProps): ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-sm font-medium whitespace-nowrap ${GAYA[nada]}`}
    >
      <Ikon aria-hidden="true" className="size-4" />
      {children}
    </span>
  );
}
