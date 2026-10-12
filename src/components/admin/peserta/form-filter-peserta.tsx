import { type ReactElement } from 'react';

import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { KODE_ALASAN } from '@/lib/domain';

type FormFilterPesertaProps = {
  jalur: string;
  nilai: { status?: string; wilayah?: string; kecamatan?: string; alasan?: string; q?: string };
  galat: Record<string, string>;
  kecamatan: readonly string[];
  namaWilayah: { W1: string; W2: string };
};

const OPSI_STATUS = [
  { nilai: '', label: 'Semua status' },
  { nilai: 'lolos', label: 'Lolos' },
  { nilai: 'gugur', label: 'Gugur' },
];

const OPSI_ALASAN = [
  { nilai: '', label: 'Semua alasan' },
  ...KODE_ALASAN.map((kode) => ({ nilai: kode, label: kode })),
];

/** Filter tabel peserta sebagai form GET: berfungsi tanpa JavaScript dan menghasilkan URL. */
export function FormFilterPeserta({
  jalur,
  nilai,
  galat,
  kecamatan,
  namaWilayah,
}: FormFilterPesertaProps): ReactElement {
  return (
    <form
      method="get"
      action={jalur}
      aria-label="Filter peserta"
      className="grid gap-4 rounded-md border border-neutral-300 bg-neutral-0 p-6 shadow-sm md:grid-cols-3 xl:grid-cols-6 xl:items-end"
    >
      <div className="md:col-span-3 xl:col-span-2">
        <Field
          label="Cari NOP atau awalan nama"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={nilai.q ?? ''}
          galat={galat.q}
        />
      </div>
      <SelectField
        label="Status"
        name="status"
        opsi={OPSI_STATUS}
        defaultValue={nilai.status ?? ''}
        galat={galat.status}
      />
      <SelectField
        label="Wilayah"
        name="wilayah"
        opsi={[
          { nilai: '', label: 'Semua wilayah' },
          { nilai: 'W1', label: namaWilayah.W1 },
          { nilai: 'W2', label: namaWilayah.W2 },
          { nilai: 'BELUM_DIPETAKAN', label: 'Belum dipetakan' },
        ]}
        defaultValue={nilai.wilayah ?? ''}
        galat={galat.wilayah}
      />
      <SelectField
        label="Kecamatan"
        name="kecamatan"
        opsi={[
          { nilai: '', label: 'Semua kecamatan' },
          ...kecamatan.map((k) => ({ nilai: k, label: k })),
        ]}
        defaultValue={nilai.kecamatan ?? ''}
        galat={galat.kecamatan}
      />
      <SelectField
        label="Alasan"
        name="alasan"
        opsi={OPSI_ALASAN}
        defaultValue={nilai.alasan ?? ''}
        galat={galat.alasan}
      />
      <div className="flex gap-3 md:col-span-3 xl:col-span-6">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary-700 px-5 text-base font-semibold text-neutral-0 hover:bg-primary-hover"
        >
          Terapkan
        </button>
        <a
          href={jalur}
          className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-neutral-0 px-5 text-base font-semibold text-primary-700 hover:bg-primary-100"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
