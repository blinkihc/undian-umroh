import { type ReactElement } from 'react';

/** Keadaan memuat tab Data Peserta: skeleton kartu dan tabel (DESIGN_SYSTEM §12 Loading). */
export default function MemuatPeserta(): ReactElement {
  return (
    <div role="status" aria-label="Memuat data peserta" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="h-28 animate-pulse rounded-md bg-neutral-50" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-md bg-neutral-50" />
      <span className="sr-only">Memuat data peserta…</span>
    </div>
  );
}
