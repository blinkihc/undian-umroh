import Link from 'next/link';
import { type ReactElement } from 'react';

type TautanTombolProps = {
  href: string;
  children: string;
  varian?: 'primary' | 'secondary';
};

const GAYA: Record<NonNullable<TautanTombolProps['varian']>, string> = {
  primary: 'bg-primary-700 text-neutral-0 hover:bg-primary-hover active:bg-primary-900',
  secondary:
    'border border-neutral-300 bg-neutral-0 text-primary-700 hover:bg-primary-100 active:bg-primary-100',
};

/** Navigasi yang tampil seperti tombol (DESIGN_SYSTEM §8), mis. "Buat Periode". */
export function TautanTombol({
  href,
  children,
  varian = 'primary',
}: TautanTombolProps): ReactElement {
  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-base font-semibold ${GAYA[varian]}`}
    >
      {children}
    </Link>
  );
}
