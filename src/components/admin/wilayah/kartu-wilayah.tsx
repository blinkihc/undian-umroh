'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, type SyntheticEvent, useState } from 'react';

import { kirimJson } from '@/client/api';
import { teksForm } from '@/client/form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { UbahPeriodeSchema, type KodeWilayah } from '@/lib/domain';

type KartuWilayahProps = {
  periodeId: string;
  version: number;
  kode: KodeWilayah;
  nama: string;
  bolehUbah: boolean;
  jumlahKecamatan: number;
  jumlahLolos: number;
};

const angka = new Intl.NumberFormat('id-ID');

/**
 * Kartu ringkasan satu wilayah dengan nama tampilan yang dapat diedit (1–50 karakter). Kode
 * W1/W2 tidak berubah; nama hanya label di layar, panel, dan berita acara.
 */
export function KartuWilayah(props: KartuWilayahProps): ReactElement {
  const { periodeId, version, kode, nama, bolehUbah, jumlahKecamatan, jumlahLolos } = props;
  const router = useRouter();
  const [ubah, setUbah] = useState(false);
  const [galat, setGalat] = useState<string | undefined>(undefined);
  const [memuat, setMemuat] = useState(false);
  const label = kode === 'W1' ? 'Wilayah 1' : 'Wilayah 2';

  async function kirim(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const baru = teksForm(new FormData(event.currentTarget), 'nama');
    const bentuk = UbahPeriodeSchema.safeParse({ version, namaWilayah: { [kode]: baru } });
    if (!bentuk.success) {
      setGalat(bentuk.error.issues[0]?.message ?? 'Nama tidak valid.');
      return;
    }
    setMemuat(true);
    const hasil = await kirimJson('PATCH', `/api/periode/${periodeId}`, bentuk.data);
    setMemuat(false);
    if (hasil.ok) {
      setGalat(undefined);
      setUbah(false);
      router.refresh();
      return;
    }
    setGalat(hasil.fields[`namaWilayah.${kode}`] ?? hasil.message);
    if (hasil.status === 409) router.refresh();
  }

  return (
    <section
      aria-label={`Ringkasan ${label}`}
      className="rounded-md border border-neutral-300 bg-neutral-0 p-4 shadow-sm"
    >
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      {ubah ? (
        <form
          noValidate
          aria-label={`Ubah nama ${label}`}
          onSubmit={(event) => {
            void kirim(event);
          }}
          className="mt-2 space-y-3"
        >
          <Field
            label="Nama tampilan"
            name="nama"
            defaultValue={nama}
            maxLength={50}
            autoComplete="off"
            galat={galat}
          />
          <div className="flex gap-2">
            <Button type="submit" memuat={memuat} labelMemuat="Menyimpan…">
              Simpan
            </Button>
            <Button
              varian="secondary"
              disabled={memuat}
              onClick={() => {
                setGalat(undefined);
                setUbah(false);
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-1 flex items-start justify-between gap-2">
          <p className="font-heading text-h3 font-semibold text-neutral-900">{nama}</p>
          {bolehUbah && (
            <button
              type="button"
              onClick={() => {
                setUbah(true);
              }}
              className="h-11 shrink-0 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-primary-100"
            >
              Ubah nama
            </button>
          )}
        </div>
      )}
      <p className="mt-2 text-sm text-neutral-600">
        {angka.format(jumlahKecamatan)} kecamatan ·{' '}
        <span className="angka-tabular">{angka.format(jumlahLolos)}</span> peserta lolos
      </p>
    </section>
  );
}
