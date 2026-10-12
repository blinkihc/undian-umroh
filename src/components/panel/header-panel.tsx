import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { type ReactElement } from 'react';

import { TombolKeluar } from '@/components/akun/tombol-keluar';
import { LogoResmi } from '@/components/ui/logo-resmi';
import { NAMA_APLIKASI } from '@/config/brand';
import { type PeranPengguna } from '@/lib/domain';

type HeaderPanelProps = {
  nama: string;
  peran: PeranPengguna;
};

/** Chip peran: ikon dan teks, tidak hanya warna (DESIGN_SYSTEM §12). */
function ChipPeran({ peran }: { peran: PeranPengguna }): ReactElement {
  const Ikon = peran === 'ADMIN' ? ShieldCheck : UserRound;
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700">
      <Ikon aria-hidden="true" className="size-4" />
      {peran === 'ADMIN' ? 'Admin' : 'Operator'}
    </span>
  );
}

/** Header Panel 64px (DESIGN_SYSTEM §11): logo dan nama aplikasi di kiri, pengguna di kanan. */
export function HeaderPanel({ nama, peran }: HeaderPanelProps): ReactElement {
  return (
    <header className="h-16 border-b border-neutral-300 bg-neutral-0">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          <LogoResmi tinggiOkus={32} />
          <p className="hidden font-heading text-base font-semibold text-neutral-900 lg:block">
            {NAMA_APLIKASI}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm font-medium text-neutral-900 sm:block">{nama}</p>
          <ChipPeran peran={peran} />
          <Link
            href="/akun/ganti-password"
            className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary-700 hover:bg-primary-100"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            Ganti kata sandi
          </Link>
          <TombolKeluar />
        </div>
      </div>
    </header>
  );
}
