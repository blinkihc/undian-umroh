import { type ReactElement, type ReactNode } from 'react';

import { type PeranPengguna } from '@/lib/domain';

import { HeaderPanel } from './header-panel';

type KerangkaPanelProps = {
  pengguna: { nama: string; peran: PeranPengguna };
  children: ReactNode;
};

/** Kerangka halaman Panel Admin dan Operator: header tetap, konten maksimum 1280px. */
export function KerangkaPanel({ pengguna, children }: KerangkaPanelProps): ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <HeaderPanel nama={pengguna.nama} peran={pengguna.peran} />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
