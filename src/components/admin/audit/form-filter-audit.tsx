import { type ReactElement } from 'react';

import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { AKSI_AUDIT } from '@/lib/domain';

type FormFilterAuditProps = {
  nilai: { aksi?: string; aktor?: string; dari?: string; sampai?: string };
  galat: Record<string, string>;
  saranAktor: readonly string[];
};

const OPSI_AKSI = [
  { nilai: '', label: 'Semua aksi' },
  ...AKSI_AUDIT.map((aksi) => ({ nilai: aksi, label: aksi })),
];

/**
 * Filter Log Audit sebagai form GET biasa: tetap berfungsi tanpa JavaScript dan menghasilkan URL
 * yang dapat dibagikan. Halaman selalu kembali ke 1 saat filter diterapkan.
 */
export function FormFilterAudit({ nilai, galat, saranAktor }: FormFilterAuditProps): ReactElement {
  return (
    <form
      method="get"
      action="/admin/audit"
      aria-label="Filter log audit"
      className="grid gap-4 rounded-md border border-neutral-300 bg-neutral-0 p-6 shadow-sm md:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      <SelectField
        label="Aksi"
        name="aksi"
        opsi={OPSI_AKSI}
        defaultValue={nilai.aksi ?? ''}
        galat={galat.aksi}
      />
      <div>
        <Field
          label="Aktor (username)"
          name="aktor"
          list="saran-aktor"
          autoComplete="off"
          defaultValue={nilai.aktor ?? ''}
          galat={galat.aktor}
        />
        <datalist id="saran-aktor">
          {saranAktor.map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>
      </div>
      <Field
        label="Dari tanggal"
        name="dari"
        type="date"
        defaultValue={nilai.dari ?? ''}
        galat={galat.dari}
      />
      <Field
        label="Sampai tanggal"
        name="sampai"
        type="date"
        defaultValue={nilai.sampai ?? ''}
        galat={galat.sampai}
      />
      <div className="flex gap-3">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary-700 px-5 text-base font-semibold text-neutral-0 hover:bg-primary-hover"
        >
          Terapkan
        </button>
        <a
          href="/admin/audit"
          className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-neutral-0 px-5 text-base font-semibold text-primary-700 hover:bg-primary-100"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
