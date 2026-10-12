import { Check, X } from 'lucide-react';
import { type ReactElement } from 'react';

import { Chip } from '@/components/ui/chip';
import { TAHUN_LUNAS, formatWaktuWib, pesanAlasan, type KodeAlasan } from '@/lib/domain';

export type PesertaTampil = {
  id: string;
  baris: number;
  nopFormat: string;
  nikMasked: string;
  nama: string;
  kecamatan: string;
  kelurahan: string;
  lunas: Readonly<Record<string, string | null>>;
  lunasRaw: Readonly<Record<string, string>>;
  eligible: boolean;
  alasan: readonly KodeAlasan[];
};

/** Tanggal lunas terbaca dalam WIB; nilai yang tidak terbaca ditampilkan apa adanya. */
function selLunas(lunas: string | null, raw: string): string {
  if (lunas !== null) return formatWaktuWib(new Date(lunas)).replace(' WIB', '');
  return raw === '' ? '—' : raw;
}

const KOLOM = [
  'Baris',
  'NOP',
  'NIK',
  'Nama',
  'Kecamatan',
  'Kelurahan',
  ...TAHUN_LUNAS.map((t) => `Lunas ${t.toString()}`),
  'Status',
  'Alasan',
];

/**
 * Tabel peserta admin (UX_FLOWS Flow 3): NOP bertitik utuh, NIK tersamar, lima tanggal lunas
 * (WIB), status, dan semua alasan gugur beserta pesannya.
 */
export function TabelPeserta({ baris }: { baris: readonly PesertaTampil[] }): ReactElement {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-300 bg-neutral-0 shadow-sm">
      <table className="w-full min-w-[1600px] text-left text-sm">
        <caption className="sr-only">Daftar peserta hasil impor; waktu lunas dalam WIB</caption>
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            {KOLOM.map((kolom) => (
              <th key={kolom} scope="col" className="px-3 py-3 font-semibold whitespace-nowrap">
                {kolom}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.map((p) => (
            <tr key={p.id} className="border-t border-neutral-300 align-top text-neutral-900">
              <td className="angka-tabular px-3 py-3">{p.baris}</td>
              <td className="px-3 py-3 font-mono whitespace-nowrap">{p.nopFormat}</td>
              <td className="px-3 py-3 font-mono whitespace-nowrap">{p.nikMasked}</td>
              <td className="px-3 py-3 font-medium">{p.nama === '' ? '—' : p.nama}</td>
              <td className="px-3 py-3">{p.kecamatan === '' ? '—' : p.kecamatan}</td>
              <td className="px-3 py-3">{p.kelurahan === '' ? '—' : p.kelurahan}</td>
              {TAHUN_LUNAS.map((t) => (
                <td key={t} className="angka-tabular px-3 py-3 whitespace-nowrap">
                  {selLunas(p.lunas[t.toString()] ?? null, p.lunasRaw[t.toString()] ?? '')}
                </td>
              ))}
              <td className="px-3 py-3">
                {p.eligible ? (
                  <Chip nada="sukses" Ikon={Check}>
                    Lolos
                  </Chip>
                ) : (
                  <Chip nada="bahaya" Ikon={X}>
                    Gugur
                  </Chip>
                )}
              </td>
              <td className="min-w-[280px] px-3 py-3">
                {p.alasan.length === 0 ? (
                  '—'
                ) : (
                  <ul className="space-y-1">
                    {p.alasan.map((kode) => (
                      <li key={kode}>
                        <span className="font-mono text-danger-700">{kode}</span>
                        <span className="block text-neutral-600">{pesanAlasan(kode)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
