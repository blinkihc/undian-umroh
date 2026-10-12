import { type ReactElement } from 'react';

import { formatWaktuWib } from '@/lib/domain';

import { ringkasPayload } from './format';

export type BarisAuditTampil = {
  id: number;
  at: string;
  aktor: string;
  aksi: string;
  targetTipe: string;
  targetId: string | null;
  payload: unknown;
  ip: string | null;
};

const KOLOM = ['Waktu', 'Aktor', 'Aksi', 'Target', 'Ringkasan', 'Detail'] as const;

/** Tabel Log Audit (UX_FLOWS Flow 16). Detail payload dibuka per baris tanpa JavaScript. */
export function TabelAudit({ baris }: { baris: readonly BarisAuditTampil[] }): ReactElement {
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-300 bg-neutral-0 shadow-sm">
      <table className="w-full min-w-[960px] text-left text-sm">
        <caption className="sr-only">Log audit, terbaru di atas</caption>
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
          {baris.map((b) => (
            <tr key={b.id} className="border-t border-neutral-300 align-top text-neutral-900">
              <td className="angka-tabular px-4 py-3 whitespace-nowrap">
                {formatWaktuWib(new Date(b.at))}
              </td>
              <td className="px-4 py-3 font-mono whitespace-nowrap">{b.aktor}</td>
              <td className="px-4 py-3 font-mono font-medium">{b.aksi}</td>
              <td className="px-4 py-3">
                {b.targetTipe}
                {b.targetId !== null && (
                  <span className="block font-mono text-neutral-600">{b.targetId}</span>
                )}
              </td>
              <td className="max-w-[320px] px-4 py-3 break-words">{ringkasPayload(b.payload)}</td>
              <td className="px-4 py-3">
                <details>
                  <summary className="cursor-pointer font-medium text-primary-700">Lihat</summary>
                  <dl className="mt-2 space-y-1">
                    <dt className="text-neutral-600">IP</dt>
                    <dd className="font-mono">{b.ip ?? '-'}</dd>
                    <dt className="text-neutral-600">Payload</dt>
                    <dd>
                      <pre className="max-w-[360px] overflow-x-auto rounded-sm bg-neutral-50 p-2 font-mono text-sm">
                        {JSON.stringify(b.payload, null, 2)}
                      </pre>
                    </dd>
                  </dl>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
