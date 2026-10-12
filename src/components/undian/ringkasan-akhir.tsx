import { Award, Download, ShieldCheck } from 'lucide-react';
import { type ReactElement } from 'react';

import { formatHashRingkas } from '@/lib/package/hash';
import { type HasilUndianData } from '@/lib/draw/hasil';
import { type StateUndian } from '@/lib/draw/types';

type RingkasanAkhirProps = {
  periodeJudul: string;
  periodeSlug: string;
  state: StateUndian;
  fileHasil: HasilUndianData | null;
  onUnduhHasil: () => void;
};

export function RingkasanAkhir({
  periodeJudul,
  periodeSlug: _periodeSlug,
  state,
  fileHasil,
  onUnduhHasil,
}: RingkasanAkhirProps): ReactElement {
  const slotW1 = state.slotSelesai.filter((s) => s.kode.startsWith('W1'));
  const slotW2 = state.slotSelesai.filter((s) => s.kode.startsWith('W2'));

  const snapshotHash = fileHasil?.snapshotHash ?? '';
  const hasilHash = fileHasil?.hasilHash ?? '';

  return (
    <div
      data-testid="ringkasan-akhir"
      className="w-full max-w-4xl space-y-6 rounded-2xl border border-neutral-300 bg-neutral-0 p-8 shadow-2xl"
    >
      <div className="text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-primary-100 text-primary-800">
          <Award className="size-8" />
        </div>
        <h2 className="mt-3 text-2xl font-black text-neutral-900">
          Undian Selesai — {periodeJudul}
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Seluruh 6 slot pemenang (utama dan cadangan) telah selesai diundi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Kartu Wilayah 1 */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
          <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-200 pb-2">
            Wilayah 1
          </h3>
          <div className="mt-3 divide-y divide-neutral-200">
            {slotW1.map((s) => (
              <div key={s.kode} className="py-2.5">
                <span className="text-[11px] font-bold text-primary-700 tracking-wider uppercase">
                  {s.kode === 'W1-UTAMA' ? 'Pemenang Utama' : s.kode === 'W1-C1' ? 'Cadangan 1' : 'Cadangan 2'}
                </span>
                <p className="text-sm font-bold text-neutral-900">{s.pemenang.nama}</p>
                <p className="font-mono text-xs text-neutral-600">
                  {s.pemenang.nopMasked} • {s.pemenang.kecamatan}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Kartu Wilayah 2 */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 shadow-sm">
          <h3 className="text-base font-bold text-neutral-900 border-b border-neutral-200 pb-2">
            Wilayah 2
          </h3>
          <div className="mt-3 divide-y divide-neutral-200">
            {slotW2.map((s) => (
              <div key={s.kode} className="py-2.5">
                <span className="text-[11px] font-bold text-primary-700 tracking-wider uppercase">
                  {s.kode === 'W2-UTAMA' ? 'Pemenang Utama' : s.kode === 'W2-C1' ? 'Cadangan 1' : 'Cadangan 2'}
                </span>
                <p className="text-sm font-bold text-neutral-900">{s.pemenang.nama}</p>
                <p className="font-mono text-xs text-neutral-600">
                  {s.pemenang.nopMasked} • {s.pemenang.kecamatan}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidik Digital */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary-700" />
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Hash Snapshot Peserta
            </span>
          </div>
          <p className="mt-1 font-mono text-base font-bold text-primary-900">
            {formatHashRingkas(snapshotHash)}
          </p>
          <p className="font-mono text-[11px] text-neutral-500 break-all">{snapshotHash}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-success-700" />
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Hash File Hasil Undian
            </span>
          </div>
          <p className="mt-1 font-mono text-base font-bold text-success-900">
            {formatHashRingkas(hasilHash)}
          </p>
          <p className="font-mono text-[11px] text-neutral-500 break-all">{hasilHash}</p>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={onUnduhHasil}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-success-700 px-8 text-base font-bold text-neutral-0 shadow-lg hover:bg-success-800 focus:outline-none focus:ring-2 focus:ring-success-700 focus:ring-offset-2"
        >
          <Download className="size-5" />
          Unduh File Hasil Undian (.json)
        </button>
      </div>
    </div>
  );
}
