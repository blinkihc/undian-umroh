import { type ReactElement } from 'react';

import { NAMA_APLIKASI } from '@/config/brand';
import { LogoResmi } from '@/components/ui/logo-resmi';

/** Header publik 72px: lambang Pemkab di kiri, logo Bapenda di kanannya (DESIGN_SYSTEM §2, §11). */
export function HeaderPublik(): ReactElement {
  return (
    <header className="h-[72px] border-b border-neutral-300 bg-neutral-0">
      <div className="mx-auto flex h-full max-w-[1280px] items-center gap-4 px-4 md:px-6">
        <LogoResmi tinggiOkus={48} />
        <p className="hidden font-heading text-base font-semibold text-neutral-900 md:block">
          {NAMA_APLIKASI}
        </p>
      </div>
    </header>
  );
}
