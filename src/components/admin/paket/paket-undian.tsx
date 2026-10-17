'use client';

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileArchive,
  History,
  Lock,
  Palette,
  Play,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';

import { TautanTombol } from '@/components/ui/tautan-tombol';

export type InfoPaket = {
  status: string;
  terkunci: boolean;
  periode: { id: string; slug: string; judul: string };
  snapshot: {
    hash: string;
    hashRingkas: string;
    lockedAt: string;
    jumlahW1: number;
    jumlahW2: number;
  } | null;
  temaId: string | null;
  temaAktif: string;
  daftarTema: { id: string; nama: string; bawaan: boolean }[];
  perkiraanUkuran: string;
  riwayatUnduhan: { at: string; oleh: string; paketSha256: string }[];
};

type PaketUndianProps = {
  periodeId: string;
  info: InfoPaket;
};

export function PaketUndian({ periodeId, info }: PaketUndianProps): ReactElement {
  const router = useRouter();
  const { terkunci, snapshot, temaAktif, perkiraanUkuran, riwayatUnduhan, daftarTema, temaId } =
    info;

  const [pilihanTema, setPilihanTema] = useState<string>(
    temaId ?? daftarTema[0]?.id ?? 'tema_bawaan_slot_mesin',
  );
  const [sedangTerapkan, setSedangTerapkan] = useState(false);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [pesanGalat, setPesanGalat] = useState<string | null>(null);
  const [peringatanUnduh, setPeringatanUnduh] = useState<string | null>(null);

  async function terapkanTema(): Promise<void> {
    if (!pilihanTema) return;
    setSedangTerapkan(true);
    setPesanSukses(null);
    setPesanGalat(null);
    setPeringatanUnduh(null);
    try {
      const respons = await fetch(`/api/periode/${periodeId}/tema`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temaId: pilihanTema }),
      });
      const data = (await respons.json()) as {
        peringatan?: string;
        error?: { message: string };
      };
      if (!respons.ok) {
        setPesanGalat(data.error?.message ?? 'Gagal menerapkan tema.');
        return;
      }
      setPesanSukses('Tema berhasil diterapkan ke periode ini.');
      if (data.peringatan) {
        setPeringatanUnduh(data.peringatan);
      }
      router.refresh();
    } catch {
      setPesanGalat('Terjadi kesalahan jaringan.');
    } finally {
      setSedangTerapkan(false);
    }
  }

  if (!terkunci || snapshot === null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-300 bg-neutral-0 px-6 py-12 text-center shadow-sm">
        <Lock aria-hidden="true" className="size-12 text-neutral-600" strokeWidth={1.75} />
        <h2 className="text-base font-semibold text-neutral-900">
          Kunci data terlebih dahulu
        </h2>
        <p className="max-w-md text-sm text-neutral-600">
          Paket undian offline hanya dapat dibuat setelah daftar peserta lolos dikunci dan memperoleh sidik digital.
        </p>
        <TautanTombol href={`/admin/periode/${periodeId}/kunci`}>
          Buka Tab Kunci Data
        </TautanTombol>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <FileArchive className="size-8 text-primary-700" />
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Paket Undian Offline</h2>
            <p className="text-sm text-neutral-600">
              Satu file .zip mandiri untuk dijalankan di laptop acara tanpa koneksi internet.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Peserta Wilayah 1
            </span>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {snapshot.jumlahW1.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Peserta Wilayah 2
            </span>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {snapshot.jumlahW2.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Tema Aktif
            </span>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{temaAktif}</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Perkiraan Ukuran
            </span>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{perkiraanUkuran}</p>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-5">
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-primary-700" />
            <h3 className="text-sm font-bold text-neutral-900">Ganti Tema Visual & Audio Undian</h3>
          </div>
          <p className="mt-1 text-xs text-neutral-600">
            Pilih preset tema animasi, musik latar, dan visual yang dikemas ke dalam paket periode ini.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={pilihanTema}
              onChange={(e) => {
                setPilihanTema(e.target.value);
                setPesanSukses(null);
                setPesanGalat(null);
                setPeringatanUnduh(null);
              }}
              className="h-10 rounded-md border border-neutral-300 bg-neutral-0 px-3 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none"
            >
              {daftarTema.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama} {t.bawaan ? '(Bawaan)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                void terapkanTema();
              }}
              disabled={sedangTerapkan || pilihanTema === temaId}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary-700 px-4 text-xs font-semibold text-neutral-0 hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {sedangTerapkan ? 'Menerapkan...' : 'Terapkan Tema'}
            </button>
            <Link
              href="/admin/tema"
              className="text-xs font-medium text-primary-700 hover:underline"
            >
              Kustomisasi preset di Pengaturan Tema →
            </Link>
          </div>

          {pesanSukses && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-success-700">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{pesanSukses}</span>
            </div>
          )}
          {peringatanUnduh && (
            <div className="mt-2 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>{peringatanUnduh}</span>
            </div>
          )}
          {pesanGalat && (
            <div className="mt-2 text-xs font-medium text-danger-600">
              {pesanGalat}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary-700" />
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Sidik Digital Snapshot
            </span>
          </div>
          <p className="mt-1 font-mono text-base font-bold text-primary-900">
            {snapshot.hashRingkas}
          </p>
          <p className="font-mono text-xs text-neutral-500 break-all">{snapshot.hash}</p>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Link
            href={`/operator/undian?periodeId=${periodeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary-700 bg-neutral-0 px-5 text-sm font-semibold text-primary-800 shadow-xs hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2"
          >
            <Play className="size-4" />
            Buka Layar Undian Langsung
          </Link>
          <a
            href={`/api/periode/${periodeId}/paket`}
            download
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-6 text-sm font-medium text-neutral-0 shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2"
          >
            <Download className="size-4" />
            Unduh Paket Undian (.zip)
          </a>
        </div>
      </div>

      {riwayatUnduhan.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <History className="size-5 text-neutral-700" />
            <h3 className="text-base font-bold text-neutral-900">Riwayat Unduhan Paket</h3>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-700">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Waktu Unduh</th>
                  <th className="px-4 py-3">Pengunduh</th>
                  <th className="px-4 py-3">SHA-256 Paket (64 Hex)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {riwayatUnduhan.map((r, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-900 whitespace-nowrap">{r.at}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{r.oleh}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600 break-all">
                      {r.paketSha256}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
