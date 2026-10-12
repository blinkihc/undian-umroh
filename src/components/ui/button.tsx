import { LoaderCircle } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ReactElement } from 'react';

type Varian = 'primary' | 'secondary' | 'danger';

type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  children: string;
  varian?: Varian;
  /** Tombol nonaktif dengan spinner; lebar tetap, label diganti `labelMemuat` (DESIGN_SYSTEM §8). */
  memuat?: boolean;
  labelMemuat?: string;
};

const GAYA_DASAR =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-base font-semibold ' +
  'disabled:cursor-not-allowed disabled:border disabled:border-neutral-300 disabled:bg-neutral-50 ' +
  'disabled:text-neutral-600';

const GAYA_VARIAN: Record<Varian, string> = {
  primary: 'bg-primary-700 text-neutral-0 hover:bg-primary-hover active:bg-primary-900',
  secondary:
    'border border-neutral-300 bg-neutral-0 text-primary-700 hover:bg-primary-100 active:bg-primary-100',
  // Aksi permanen (mis. Nonaktifkan Akun); selalu didahului konfirmasi (DESIGN_SYSTEM §8).
  danger: 'bg-danger-700 text-neutral-0 hover:bg-danger-700/90 active:bg-danger-700',
};

/** Tombol Panel & Publik (DESIGN_SYSTEM §8): tinggi 44px, radius `md`, satu Primary per area. */
export function Button({
  children,
  varian = 'primary',
  memuat = false,
  labelMemuat,
  className = '',
  type = 'button',
  disabled,
  ...sisa
}: ButtonProps): ReactElement {
  return (
    <button
      type={type}
      disabled={disabled === true || memuat}
      aria-busy={memuat}
      className={`${GAYA_DASAR} ${GAYA_VARIAN[varian]} ${className}`}
      {...sisa}
    >
      {memuat && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {memuat ? (labelMemuat ?? children) : children}
    </button>
  );
}
