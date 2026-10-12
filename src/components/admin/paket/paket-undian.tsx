'use client';

import { Download, FileArchive, History, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { type ReactElement } from 'react';

import { TautanTombol } from '@/components/ui/tautan-tombol';
import { type InfoPaket } from '@/server/services/paket';

type PaketUndianProps = {
  periodeId: string;
  info: InfoPaket;
};

export function PaketUndian({ periodeId, info }: PaketUndianProps): ReactElement {
  const { terkunci, periode, snapshot, temaAktif, perkiraanUkuran, riwayatUnduhan } = info;

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

        <div className="mt-8 flex justify-end">
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
                {riwayatUnduhan.map((r, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 whitespace-nowrap">{r.at}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-900">
                      {r.oleh}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs break-all text-neutral-600">
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
