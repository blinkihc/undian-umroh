import Image from 'next/image';
import { type ReactElement } from 'react';

import { LOGO_BAPENDA, LOGO_OKUS } from '@/config/brand';

type LogoResmiProps = {
  /** Tinggi lambang Pemkab: 32 (Panel), 48 (Publik), atau 96 (Layar Undian) piksel. */
  tinggiOkus: 32 | 48 | 96;
};

/**
 * Pasangan logo resmi (DESIGN_SYSTEM §2): lambang Pemkab di kiri, logo Bapenda di kanannya
 * dengan tinggi x0,6 karena berbentuk melebar, jarak 16px.
 */
export function LogoResmi({ tinggiOkus }: LogoResmiProps): ReactElement {
  const tinggiBapenda = Math.round(tinggiOkus * 0.6);
  const lebarBapenda = Math.round((tinggiBapenda * LOGO_BAPENDA.lebar) / LOGO_BAPENDA.tinggi);
  return (
    <div className="flex items-center gap-4">
      <Image
        src={LOGO_OKUS.src}
        alt={LOGO_OKUS.alt}
        width={Math.round((tinggiOkus * LOGO_OKUS.lebar) / LOGO_OKUS.tinggi)}
        height={tinggiOkus}
        sizes={`${tinggiOkus.toString()}px`}
        priority
      />
      <Image
        src={LOGO_BAPENDA.src}
        alt={LOGO_BAPENDA.alt}
        width={lebarBapenda}
        height={tinggiBapenda}
        sizes={`${lebarBapenda.toString()}px`}
        priority
      />
    </div>
  );
}
