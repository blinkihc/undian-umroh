import { type ReactElement, type ReactNode } from 'react';

import { type PeranPengguna } from '@/lib/domain';

import { HeaderPanel } from './header-panel';

type KerangkaPanelProps = {
  pengguna: { nama: string; peran: PeranPengguna };
  /** Menu samping (Panel Admin). Panel Operator tanpa sidebar (DESIGN_SYSTEM §11). */
  navigasi?: ReactNode;
  children: ReactNode;
};

/** Kerangka halaman Panel Admin dan Operator: header tetap, sidebar opsional, konten maks. 1280px. */
export function KerangkaPanel({ pengguna, navigasi, children }: KerangkaPanelProps): ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <HeaderPanel nama={pengguna.nama} peran={pengguna.peran} />
      <div className="flex flex-1 flex-col md:flex-row">
        {navigasi}
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
