'use client';

import { type ReactElement, type SyntheticEvent, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { GantiPasswordSchema, PESAN_PASSWORD_DITOLAK, periksaPasswordBaru } from '@/lib/domain';

import { bukaHalaman } from './auth-klien';

type FormGantiPasswordProps = {
  username: string;
  /** Akun wajib ganti kata sandi: setelah berhasil langsung diarahkan ke beranda. */
  wajib: boolean;
  beranda: '/admin' | '/operator';
};

type NamaField = 'passwordLama' | 'passwordBaru' | 'ulangi';
type GalatField = Partial<Record<NamaField, string>>;

type IsiGalatApi = { error?: { message?: string; details?: { fields?: Record<string, string> } } };

/** Nilai field teks dari FormData; nilai bukan teks (berkas) dianggap kosong. */
function teks(data: FormData, nama: string): string {
  const nilai = data.get(nama);
  return typeof nilai === 'string' ? nilai : '';
}

const PESAN_JARINGAN = 'Koneksi terputus. Perubahan belum tersimpan. Coba lagi.';

export function FormGantiPassword({
  username,
  wajib,
  beranda,
}: FormGantiPasswordProps): ReactElement {
  const [galatField, setGalatField] = useState<GalatField>({});
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);
  const [memuat, setMemuat] = useState(false);

  /** Validasi di klien memakai aturan yang sama dengan server (src/lib/domain/akun). */
  function periksa(passwordLama: string, passwordBaru: string, ulangi: string): GalatField {
    const hasil: GalatField = {};
    const bentuk = GantiPasswordSchema.safeParse({ passwordLama, passwordBaru });
    if (!bentuk.success) {
      for (const isu of bentuk.error.issues) {
        const nama = isu.path[0];
        if (nama === 'passwordLama' || nama === 'passwordBaru') {
          hasil[nama] ??= isu.message;
        }
      }
    } else {
      const aturan = periksaPasswordBaru({ passwordBaru, username, passwordLama });
      if (!aturan.ok) {
        hasil.passwordBaru = PESAN_PASSWORD_DITOLAK[aturan.error];
      }
    }
    if (ulangi !== passwordBaru) {
      hasil.ulangi = 'Kata sandi baru tidak sama.';
    }
    return hasil;
  }

  async function kirim(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formulir = event.currentTarget;
    const data = new FormData(formulir);
    const passwordLama = teks(data, 'passwordLama');
    const passwordBaru = teks(data, 'passwordBaru');
    const ulangi = teks(data, 'ulangi');

    const masalah = periksa(passwordLama, passwordBaru, ulangi);
    setGalatField(masalah);
    setGalat(null);
    setBerhasil(false);
    if (Object.keys(masalah).length > 0) {
      return;
    }

    setMemuat(true);
    try {
      const respons = await fetch('/api/akun/ganti-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordLama, passwordBaru }),
      });
      if (respons.ok) {
        if (wajib) {
          bukaHalaman(beranda);
          return;
        }
        formulir.reset();
        setBerhasil(true);
        setMemuat(false);
        return;
      }
      const isi = (await respons.json()) as IsiGalatApi;
      const fields = isi.error?.details?.fields ?? {};
      const dariServer: GalatField = {};
      if (fields.passwordLama !== undefined) dariServer.passwordLama = fields.passwordLama;
      if (fields.passwordBaru !== undefined) dariServer.passwordBaru = fields.passwordBaru;
      setGalatField(dariServer);
      if (Object.keys(dariServer).length === 0) {
        setGalat(isi.error?.message ?? PESAN_JARINGAN);
      }
    } catch {
      setGalat(PESAN_JARINGAN);
    }
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
      {wajib && (
        <Alert jenis="peringatan" judul="Anda harus mengganti kata sandi sebelum melanjutkan." />
      )}
      {berhasil && <Alert jenis="info" judul="Kata sandi berhasil diganti." />}
      {galat !== null && <Alert jenis="galat" judul={galat} />}
      <Field
        label="Kata sandi lama"
        name="passwordLama"
        type="password"
        autoComplete="current-password"
        required
        galat={galatField.passwordLama}
      />
      <Field
        label="Kata sandi baru (minimal 12 karakter)"
        name="passwordBaru"
        type="password"
        autoComplete="new-password"
        required
        galat={galatField.passwordBaru}
      />
      <Field
        label="Ulangi kata sandi baru"
        name="ulangi"
        type="password"
        autoComplete="new-password"
        required
        galat={galatField.ulangi}
      />
      <Button type="submit" memuat={memuat} labelMemuat="Menyimpan…" className="w-full">
        Simpan kata sandi
      </Button>
    </form>
  );
}
