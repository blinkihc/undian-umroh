import { CircleX, Info, TriangleAlert } from 'lucide-react';
import { type ReactElement } from 'react';

type Jenis = 'galat' | 'peringatan' | 'info';

type AlertProps = {
  jenis: Jenis;
  judul: string;
  children?: string;
};

const GAYA: Record<Jenis, { wadah: string; ikon: string; Ikon: typeof Info }> = {
  galat: { wadah: 'bg-danger-100 border-danger-700', ikon: 'text-danger-700', Ikon: CircleX },
  peringatan: {
    wadah: 'bg-warning-100 border-warning-700',
    ikon: 'text-warning-700',
    Ikon: TriangleAlert,
  },
  info: { wadah: 'bg-primary-100 border-primary-700', ikon: 'text-primary-700', Ikon: Info },
};

/** Banner status (DESIGN_SYSTEM §12): selalu berikon dan berteks, tidak hanya warna. */
export function Alert({ jenis, judul, children }: AlertProps): ReactElement {
  const { wadah, ikon, Ikon } = GAYA[jenis];
  return (
    <div
      role={jenis === 'galat' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-md border p-4 ${wadah}`}
    >
      <Ikon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${ikon}`} />
      <div>
        <p className="text-base font-semibold text-neutral-900">{judul}</p>
        {children !== undefined && <p className="mt-1 text-sm text-neutral-600">{children}</p>}
      </div>
    </div>
  );
}
