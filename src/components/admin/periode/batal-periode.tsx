'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, type SyntheticEvent, useState } from 'react';

import { kirimJson } from '@/client/api';
import { galatPerField, teksForm } from '@/client/form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextareaField } from '@/components/ui/textarea-field';
import { BatalPeriodeSchema } from '@/lib/domain';

type BatalPeriodeProps = { id: string; version: number };

/**
 * Pembatalan periode (DECISIONS 016): aksi permanen, jadi didahului konfirmasi sebaris dan
 * alasan wajib. Setelah dibatalkan, periode baru dapat dibuat.
 */
export function BatalPeriode({ id, version }: BatalPeriodeProps): ReactElement {
  const router = useRouter();
  const [terbuka, setTerbuka] = useState(false);
  const [galat, setGalat] = useState<string | undefined>(undefined);
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function kirim(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setGalatUmum(null);
    const alasan = teksForm(new FormData(event.currentTarget), 'alasan');
    const bentuk = BatalPeriodeSchema.safeParse({ version, alasan });
    if (!bentuk.success) {
      setGalat(galatPerField(bentuk.error.issues).alasan ?? 'Alasan tidak valid.');
      return;
    }
    setGalat(undefined);
    setMemuat(true);
    const hasil = await kirimJson('POST', `/api/periode/${id}/batal`, bentuk.data);
    setMemuat(false);
    if (hasil.ok) {
      setTerbuka(false);
      router.refresh();
      return;
    }
    if (hasil.fields.alasan !== undefined) {
      setGalat(hasil.fields.alasan);
      return;
    }
    setGalatUmum(hasil.message);
    if (hasil.status === 409) {
      router.refresh();
    }
  }

  return (
    <section
      aria-labelledby="judul-batal-periode"
      className="space-y-4 rounded-md border border-danger-700 bg-neutral-0 p-6 shadow-sm"
    >
      <div>
        <h2 id="judul-batal-periode" className="font-heading text-h3 font-semibold text-danger-700">
          Batalkan Periode
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Pembatalan bersifat final dan tercatat di log audit. Data harus diimpor ulang di periode
          baru.
        </p>
      </div>
      {galatUmum !== null && <Alert jenis="galat" judul={galatUmum} />}
      {terbuka ? (
        <form
          noValidate
          aria-label="Konfirmasi batalkan periode"
          onSubmit={(event) => {
            void kirim(event);
          }}
          className="space-y-4"
        >
          <TextareaField
            label="Alasan pembatalan (10–500 karakter)"
            name="alasan"
            required
            maxLength={500}
            galat={galat}
          />
          <div className="flex gap-3">
            <Button type="submit" varian="danger" memuat={memuat} labelMemuat="Membatalkan…">
              Ya, batalkan periode
            </Button>
            <Button
              varian="secondary"
              disabled={memuat}
              onClick={() => {
                setGalat(undefined);
                setTerbuka(false);
              }}
            >
              Kembali
            </Button>
          </div>
        </form>
      ) : (
        <Button
          varian="danger"
          onClick={() => {
            setTerbuka(true);
          }}
        >
          Batalkan Periode
        </Button>
      )}
    </section>
  );
}
