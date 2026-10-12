'use client';

import { type ReactElement, type SyntheticEvent, useState } from 'react';

import { kirimJson } from '@/client/api';
import { galatPerField, teksForm } from '@/client/form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { UbahPenggunaSchema } from '@/lib/domain';

export type AkunAksi = {
  id: string;
  username: string;
  aktif: boolean;
  version: number;
};

type AksiAkunProps = {
  akun: AkunAksi;
  diriSendiri: boolean;
  /** Dipanggil setelah perubahan berhasil atau gagal, dengan pesan untuk pengguna. */
  onSelesai: (hasil: { ok: boolean; pesan: string }) => void;
};

type Mode = 'diam' | 'konfirmasi-nonaktif' | 'reset';

/**
 * Aksi per akun: Nonaktifkan (dengan konfirmasi), Aktifkan, dan Reset kata sandi.
 * Akun sendiri tidak dapat dinonaktifkan (tombol tidak ditampilkan; server juga menolak).
 */
export function AksiAkun({ akun, diriSendiri, onSelesai }: AksiAkunProps): ReactElement {
  const [mode, setMode] = useState<Mode>('diam');
  const [memuat, setMemuat] = useState(false);
  const [galatReset, setGalatReset] = useState<string | undefined>(undefined);

  async function ubah(perubahan: Record<string, unknown>, berhasil: string): Promise<boolean> {
    setMemuat(true);
    const hasil = await kirimJson('PATCH', `/api/pengguna/${akun.id}`, {
      version: akun.version,
      ...perubahan,
    });
    setMemuat(false);
    if (hasil.ok) {
      setMode('diam');
      onSelesai({ ok: true, pesan: berhasil });
      return true;
    }
    if (hasil.fields.resetPassword !== undefined) {
      setGalatReset(hasil.fields.resetPassword);
      return false;
    }
    onSelesai({ ok: false, pesan: hasil.message });
    return false;
  }

  async function kirimReset(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const resetPassword = teksForm(new FormData(event.currentTarget), 'resetPassword');
    const bentuk = UbahPenggunaSchema.safeParse({ version: akun.version, resetPassword });
    if (!bentuk.success) {
      setGalatReset(galatPerField(bentuk.error.issues).resetPassword ?? 'Kata sandi tidak valid.');
      return;
    }
    setGalatReset(undefined);
    await ubah(
      { resetPassword },
      `Kata sandi ${akun.username} di-reset. Pemilik akun wajib menggantinya saat login berikutnya.`,
    );
  }

  if (mode === 'konfirmasi-nonaktif') {
    return (
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Konfirmasi">
        <span className="text-sm text-neutral-900">Nonaktifkan {akun.username}?</span>
        <Button
          varian="danger"
          memuat={memuat}
          labelMemuat="Menyimpan…"
          onClick={() => {
            void ubah({ aktif: false }, `Akun ${akun.username} dinonaktifkan.`);
          }}
        >
          Ya, nonaktifkan
        </Button>
        <Button
          varian="secondary"
          disabled={memuat}
          onClick={() => {
            setMode('diam');
          }}
        >
          Batal
        </Button>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <form
        noValidate
        aria-label={`Reset kata sandi ${akun.username}`}
        onSubmit={(event) => {
          void kirimReset(event);
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="min-w-60 flex-1">
          <Field
            label="Kata sandi sementara (minimal 12 karakter)"
            name="resetPassword"
            type="password"
            autoComplete="new-password"
            required
            galat={galatReset}
          />
        </div>
        <Button type="submit" memuat={memuat} labelMemuat="Menyimpan…">
          Simpan
        </Button>
        <Button
          varian="secondary"
          disabled={memuat}
          onClick={() => {
            setGalatReset(undefined);
            setMode('diam');
          }}
        >
          Batal
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {akun.aktif && !diriSendiri && (
        <Button
          varian="danger"
          onClick={() => {
            setMode('konfirmasi-nonaktif');
          }}
        >
          Nonaktifkan
        </Button>
      )}
      {!akun.aktif && (
        <Button
          varian="secondary"
          memuat={memuat}
          labelMemuat="Menyimpan…"
          onClick={() => {
            void ubah({ aktif: true }, `Akun ${akun.username} diaktifkan.`);
          }}
        >
          Aktifkan
        </Button>
      )}
      <Button
        varian="secondary"
        onClick={() => {
          setMode('reset');
        }}
      >
        Reset kata sandi
      </Button>
    </div>
  );
}
