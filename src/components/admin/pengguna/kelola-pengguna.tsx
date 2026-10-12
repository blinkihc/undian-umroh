'use client';

import { CircleCheck, CircleSlash, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { formatWaktuWib } from '@/lib/domain';

import { AksiAkun } from './aksi-akun';
import { FormTambahPengguna } from './form-tambah-pengguna';

export type AkunTampil = {
  id: string;
  username: string;
  nama: string;
  peran: 'ADMIN' | 'OPERATOR';
  aktif: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  version: number;
};

type KelolaPenggunaProps = {
  akun: readonly AkunTampil[];
  /** ID Admin yang sedang masuk. */
  idSaya: string;
};

type Pesan = { ok: boolean; pesan: string } | null;

const KOLOM = ['Nama', 'Username', 'Peran', 'Status', 'Login terakhir', 'Aksi'] as const;

/** Halaman Pengguna (UX_FLOWS Flow 16): tabel akun, tambah akun, dan aksi per akun. */
export function KelolaPengguna({ akun, idSaya }: KelolaPenggunaProps): ReactElement {
  const router = useRouter();
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [pesan, setPesan] = useState<Pesan>(null);

  function selesai(hasil: { ok: boolean; pesan: string }): void {
    setPesan(hasil);
    // Data tabel dibaca ulang dari server agar status dan version selalu terbaru.
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-h1 font-bold text-neutral-900">Pengguna</h1>
        {!formTerbuka && (
          <Button
            onClick={() => {
              setPesan(null);
              setFormTerbuka(true);
            }}
          >
            Tambah Pengguna
          </Button>
        )}
      </div>

      {pesan !== null && <Alert jenis={pesan.ok ? 'info' : 'galat'} judul={pesan.pesan} />}

      {formTerbuka && (
        <FormTambahPengguna
          onBatal={() => {
            setFormTerbuka(false);
          }}
          onBerhasil={(username) => {
            setFormTerbuka(false);
            selesai({
              ok: true,
              pesan: `Akun ${username} dibuat. Pemilik akun wajib mengganti kata sandi saat login pertama.`,
            });
          }}
        />
      )}

      <div className="overflow-x-auto rounded-md border border-neutral-300 bg-neutral-0 shadow-sm">
        <table className="w-full min-w-[960px] text-left text-sm">
          <caption className="sr-only">Daftar akun Admin dan Operator</caption>
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              {KOLOM.map((kolom) => (
                <th key={kolom} scope="col" className="px-4 py-3 font-semibold">
                  {kolom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {akun.map((a) => (
              <BarisAkun key={a.id} akun={a} diriSendiri={a.id === idSaya} onSelesai={selesai} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type BarisAkunProps = {
  akun: AkunTampil;
  diriSendiri: boolean;
  onSelesai: (hasil: { ok: boolean; pesan: string }) => void;
};

function BarisAkun({ akun, diriSendiri, onSelesai }: BarisAkunProps): ReactElement {
  return (
    <tr className="border-t border-neutral-300 align-top">
      <td className="px-4 py-3 text-base font-medium text-neutral-900">
        {akun.nama}
        {diriSendiri && <span className="ml-2 text-sm text-neutral-600">(Anda)</span>}
      </td>
      <td className="px-4 py-3 font-mono whitespace-nowrap text-neutral-900">{akun.username}</td>
      <td className="px-4 py-3">
        {akun.peran === 'ADMIN' ? (
          <Chip nada="primer" Ikon={ShieldCheck}>
            Admin
          </Chip>
        ) : (
          <Chip nada="netral" Ikon={UserRound}>
            Operator
          </Chip>
        )}
      </td>
      <td className="space-y-1 px-4 py-3">
        {akun.aktif ? (
          <Chip nada="sukses" Ikon={CircleCheck}>
            Aktif
          </Chip>
        ) : (
          <Chip nada="bahaya" Ikon={CircleSlash}>
            Nonaktif
          </Chip>
        )}
        {akun.mustChangePassword && (
          <p className="flex items-center gap-1 text-sm text-warning-700">
            <KeyRound aria-hidden="true" className="size-4" />
            Wajib ganti kata sandi
          </p>
        )}
      </td>
      <td className="angka-tabular px-4 py-3 text-neutral-900">
        {akun.lastLoginAt === null ? 'Belum pernah' : formatWaktuWib(new Date(akun.lastLoginAt))}
      </td>
      <td className="px-4 py-3">
        <AksiAkun akun={akun} diriSendiri={diriSendiri} onSelesai={onSelesai} />
      </td>
    </tr>
  );
}
