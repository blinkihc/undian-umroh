import { CircleAlert } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ReactElement, useId } from 'react';

type FieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'> & {
  label: string;
  /** Pesan galat di bawah field; mengaktifkan `aria-invalid` dan `aria-describedby`. */
  galat?: string | undefined;
  /** Teks bantuan di bawah field (14px `neutral-600`), mis. alasan field nonaktif. */
  keterangan?: string | undefined;
};

/**
 * Kolom isian berlabel (DESIGN_SYSTEM §9): label di atas (14px/500), tinggi 44px, galat berikon
 * dan pesan di bawah. Placeholder tidak dipakai sebagai label.
 */
export function Field({ label, galat, keterangan, ...sisa }: FieldProps): ReactElement {
  const id = useId();
  const idGalat = `${id}-galat`;
  const idKeterangan = `${id}-keterangan`;
  const adaGalat = galat !== undefined && galat !== '';
  const adaKeterangan = keterangan !== undefined && keterangan !== '';
  const terkait = [adaGalat && idGalat, adaKeterangan && idKeterangan].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={adaGalat}
        aria-describedby={terkait === '' ? undefined : terkait}
        className={`mt-1 block h-11 w-full rounded-sm border bg-neutral-0 px-3 text-base text-neutral-900 placeholder:text-neutral-600 focus-visible:ring-[3px] focus-visible:ring-primary-500/40 focus-visible:outline-none disabled:bg-neutral-50 disabled:text-neutral-600 ${
          adaGalat
            ? 'border-danger-700 focus-visible:border-danger-700'
            : 'border-neutral-300 focus-visible:border-primary-700'
        }`}
        {...sisa}
      />
      {adaGalat && (
        <p id={idGalat} className="mt-1 flex items-start gap-1 text-sm text-danger-700">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{galat}</span>
        </p>
      )}
      {adaKeterangan && (
        <p id={idKeterangan} className="mt-1 text-sm text-neutral-600">
          {keterangan}
        </p>
      )}
    </div>
  );
}
