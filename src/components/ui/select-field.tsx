import { ChevronDown, CircleAlert } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ReactElement, useId } from 'react';

type Opsi = { nilai: string; label: string };

type SelectFieldProps = Omit<
  ComponentPropsWithoutRef<'select'>,
  'id' | 'className' | 'children'
> & {
  label: string;
  opsi: readonly Opsi[];
  galat?: string | undefined;
};

/** Pilihan berlabel dengan gaya yang sama dengan `Field` (DESIGN_SYSTEM §9). */
export function SelectField({ label, opsi, galat, ...sisa }: SelectFieldProps): ReactElement {
  const id = useId();
  const idGalat = `${id}-galat`;
  const adaGalat = galat !== undefined && galat !== '';
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <div className="relative mt-1">
        <select
          id={id}
          aria-invalid={adaGalat}
          aria-describedby={adaGalat ? idGalat : undefined}
          className={`block h-11 w-full appearance-none rounded-sm border bg-neutral-0 pr-10 pl-3 text-base text-neutral-900 focus-visible:ring-[3px] focus-visible:ring-primary-500/40 focus-visible:outline-none disabled:bg-neutral-50 disabled:text-neutral-600 ${
            adaGalat
              ? 'border-danger-700 focus-visible:border-danger-700'
              : 'border-neutral-300 focus-visible:border-primary-700'
          }`}
          {...sisa}
        >
          {opsi.map((o) => (
            <option key={o.nilai} value={o.nilai}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-neutral-600"
        />
      </div>
      {adaGalat && (
        <p id={idGalat} className="mt-1 flex items-start gap-1 text-sm text-danger-700">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{galat}</span>
        </p>
      )}
    </div>
  );
}
