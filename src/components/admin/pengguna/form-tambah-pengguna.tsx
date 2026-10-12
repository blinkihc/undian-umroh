'use client';

import { type ReactElement, type SyntheticEvent, useState } from 'react';

import { kirimJson } from '@/client/api';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { BuatPenggunaSchema } from '@/lib/domain';

import { galatPerField, teksForm } from './bantuan';

type FormTambahPenggunaProps = {
  onBerhasil: (username: string) => void;
  onBatal: () => void;
};

const OPSI_PERAN = [
  { nilai: 'OPERATOR', label: 'Operator' },
  { nilai: 'ADMIN', label: 'Admin' },
] as const;

/** Tambah akun (UX_FLOWS Flow 16): validasi klien memakai skema yang sama dengan server. */
export function FormTambahPengguna({ onBerhasil, onBatal }: FormTambahPenggunaProps): ReactElement {
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function kirim(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const isi = {
      nama: teksForm(data, 'nama'),
      username: teksForm(data, 'username'),
      peran: teksForm(data, 'peran'),
      passwordAwal: teksForm(data, 'passwordAwal'),
    };
    setGalatUmum(null);
    const bentuk = BuatPenggunaSchema.safeParse(isi);
    if (!bentuk.success) {
      setGalat(galatPerField(bentuk.error.issues));
      return;
    }
    setGalat({});
    setMemuat(true);
    const hasil = await kirimJson<{ username: string }>('POST', '/api/pengguna', bentuk.data);
    setMemuat(false);
    if (hasil.ok) {
      onBerhasil(hasil.data.username);
      return;
    }
    setGalat(hasil.fields);
    if (Object.keys(hasil.fields).length === 0) {
      setGalatUmum(hasil.message);
    }
  }

  return (
    <form
      noValidate
      aria-label="Tambah pengguna"
      onSubmit={(event) => {
        void kirim(event);
      }}
      className="space-y-4 rounded-md border border-neutral-300 bg-neutral-0 p-6 shadow-sm"
    >
      <h2 className="font-heading text-h3 font-semibold text-neutral-900">Tambah Pengguna</h2>
      {galatUmum !== null && <Alert jenis="galat" judul={galatUmum} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nama" name="nama" autoComplete="off" required galat={galat.nama} />
        <Field
          label="Username"
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          placeholder="operator.satu"
          required
          galat={galat.username}
        />
        <SelectField label="Peran" name="peran" opsi={OPSI_PERAN} galat={galat.peran} />
        <Field
          label="Kata sandi awal (minimal 12 karakter)"
          name="passwordAwal"
          type="password"
          autoComplete="new-password"
          required
          galat={galat.passwordAwal}
        />
      </div>
      <p className="text-sm text-neutral-600">
        Berikan kata sandi awal kepada pemilik akun. Kata sandi wajib diganti saat login pertama.
      </p>
      <div className="flex gap-3">
        <Button type="submit" memuat={memuat} labelMemuat="Menyimpan…">
          Simpan
        </Button>
        <Button varian="secondary" onClick={onBatal} disabled={memuat}>
          Batal
        </Button>
      </div>
    </form>
  );
}
