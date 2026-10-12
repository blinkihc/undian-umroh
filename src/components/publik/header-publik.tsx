import Image from 'next/image';

import { LOGO_BAPENDA, LOGO_OKUS, NAMA_APLIKASI } from '@/config/brand';

// Tinggi lambang Pemkab 48px (Publik); logo Bapenda x0,6 karena berbentuk melebar (DESIGN_SYSTEM §2).
const TINGGI_OKUS = 48;
const TINGGI_BAPENDA = Math.round(TINGGI_OKUS * 0.6);

/** Header publik 72px: lambang Pemkab di kiri, logo Bapenda di kanannya (DESIGN_SYSTEM §2, §11). */
export function HeaderPublik() {
  return (
    <header className="h-[72px] border-b border-neutral-300 bg-neutral-0">
      <div className="mx-auto flex h-full max-w-[1280px] items-center gap-4 px-4 md:px-6">
        <Image
          src={LOGO_OKUS.src}
          alt={LOGO_OKUS.alt}
          width={Math.round((TINGGI_OKUS * LOGO_OKUS.lebar) / LOGO_OKUS.tinggi)}
          height={TINGGI_OKUS}
          sizes="48px"
          priority
        />
        <Image
          src={LOGO_BAPENDA.src}
          alt={LOGO_BAPENDA.alt}
          width={Math.round((TINGGI_BAPENDA * LOGO_BAPENDA.lebar) / LOGO_BAPENDA.tinggi)}
          height={TINGGI_BAPENDA}
          sizes="96px"
          priority
        />
        <p className="hidden font-heading text-base font-semibold text-neutral-900 md:block">
          {NAMA_APLIKASI}
        </p>
      </div>
    </header>
  );
}
