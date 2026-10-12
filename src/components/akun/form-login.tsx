'use client';

import { type ReactElement, type SyntheticEvent, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { LoginSchema } from '@/lib/domain';

import { bukaHalaman, kirimLogin } from './auth-klien';

type FormLoginProps = {
  /** Tujuan setelah masuk (sudah divalidasi server sebagai jalur internal), atau null. */
  callbackUrl: string | null;
};

type GalatField = { username?: string; password?: string };

/** Nilai field teks dari FormData; nilai bukan teks (berkas) dianggap kosong. */
function teks(data: FormData, nama: string): string {
  const nilai = data.get(nama);
  return typeof nilai === 'string' ? nilai : '';
}

export function FormLogin({ callbackUrl }: FormLoginProps): ReactElement {
  const [galatField, setGalatField] = useState<GalatField>({});
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function kirim(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const masukan = LoginSchema.safeParse({
      username: teks(data, 'username'),
      password: teks(data, 'password'),
    });
    if (!masukan.success) {
      const baru: GalatField = {};
      for (const isu of masukan.error.issues) {
        const nama = isu.path[0];
        if (nama === 'username' || nama === 'password') {
          baru[nama] ??= isu.message;
        }
      }
      setGalatField(baru);
      return;
    }

    setGalatField({});
    setGalat(null);
    setMemuat(true);
    const hasil = await kirimLogin(masukan.data.username, masukan.data.password);
    if (hasil.ok) {
      // Halaman /login menentukan tujuan sesuai peran begitu sesi sudah ada.
      bukaHalaman(
        callbackUrl === null ? '/login' : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
      return;
    }
    setGalat(hasil.pesan);
    setMemuat(false);
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void kirim(event);
      }}
      className="space-y-4"
    >
      {galat !== null && <Alert jenis="galat" judul={galat} />}
      <Field
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        galat={galatField.username}
      />
      <Field
        label="Kata sandi"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        galat={galatField.password}
      />
      <Button type="submit" memuat={memuat} labelMemuat="Memproses…" className="w-full">
        Masuk
      </Button>
    </form>
  );
}
