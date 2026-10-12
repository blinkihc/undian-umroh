import { CircleAlert } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ReactElement, useId } from 'react';

type TextareaFieldProps = Omit<ComponentPropsWithoutRef<'textarea'>, 'id' | 'className'> & {
  label: string;
  galat?: string | undefined;
};

/** Isian teks panjang berlabel dengan pola galat yang sama dengan `Field` (DESIGN_SYSTEM §9). */
export function TextareaField({
  label,
  galat,
  rows = 3,
  ...sisa
}: TextareaFieldProps): ReactElement {
  const id = useId();
  const idGalat = `${id}-galat`;
  const adaGalat = galat !== undefined && galat !== '';
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={adaGalat}
        aria-describedby={adaGalat ? idGalat : undefined}
        className={`mt-1 block w-full rounded-sm border bg-neutral-0 px-3 py-2 text-base text-neutral-900 focus-visible:ring-[3px] focus-visible:ring-primary-500/40 focus-visible:outline-none ${
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
    </div>
  );
}
