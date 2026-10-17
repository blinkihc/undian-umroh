import { Award, Download, RotateCcw, ShieldCheck } from 'lucide-react';
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
  onResetUndian?: () => void;
};

export function RingkasanAkhir({
  periodeJudul,
  periodeSlug: _periodeSlug,
  state,
  fileHasil,
  onUnduhHasil,
  onResetUndian,
}: RingkasanAkhirProps): ReactElement {
  const slotW1 = state.slotSelesai.filter((s) => s.kode.startsWith('W1'));
  const slotW2 = state.slotSelesai.filter((s) => s.kode.startsWith('W2'));

  const snapshotHash = fileHasil?.snapshotHash ?? '';
  const hasilHash = fileHasil?.hasilHash ?? '';

  return (
    <div
      data-testid="ringkasan-akhir"
      className="relative w-full max-w-4xl overflow-hidden rounded-[26px] p-[1.5px] shadow-2xl transition-all"
      style={{
        background:
          'linear-gradient(145deg, #F8DF94 0%, #E2B957 24%, #6E4D0E 48%, #F6E7C1 72%, #A78028 100%)',
        boxShadow:
          '0 0 0 1px rgba(226, 185, 87, 0.35), 0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 50px -10px rgba(226, 185, 87, 0.2)',
      }}
    >
      <div className="relative overflow-hidden rounded-[24.5px] bg-gradient-to-b from-[#08182f] via-[#041021] to-[#020914] p-6 sm:p-8 space-y-6 text-slate-100">
        {/* Ornamen Sudut Emas */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-3 size-9 opacity-50 sm:size-10"
        >
          <svg className="size-full text-[#E2B957]" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 40 40">
            <path d="M2 38 V10 C2 5.58 5.58 2 10 2 H38" />
            <path d="M7 38 V14 C7 10.13 10.13 7 14 7 H38" strokeDasharray="2,2" />
            <circle cx="10" cy="10" r="2" fill="currentColor" />
          </svg>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-3 size-9 opacity-50 sm:size-10"
        >
          <svg className="size-full text-[#E2B957]" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 40 40">
            <path d="M38 38 V10 C38 5.58 34.42 2 30 2 H2" />
            <path d="M33 38 V14 C33 10.13 29.87 7 26 7 H2" strokeDasharray="2,2" />
            <circle cx="30" cy="10" r="2" fill="currentColor" />
          </svg>
        </div>

        {/* Header Hasil Pengundian */}
        <div className="text-center">
          <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full border border-[#E2B957]/50 bg-[#E2B957]/15 text-[#E2B957] shadow-inner">
            <Award className="size-6" />
          </div>
          <h2 className="mt-2.5 text-2xl sm:text-3xl font-black uppercase tracking-wider text-accent-400 drop-shadow-md">
            Undian Selesai — {periodeJudul}
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold tracking-wide text-primary-200">
            Seluruh {state.slotSelesai.length} pemenang telah selesai diundi.
          </p>
        </div>

        {/* Papan Kartu Pemenang Per Zona (Data Besar & Jelas) */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 text-left">
          {/* Zona 1 */}
          <div className="relative overflow-hidden rounded-2xl border border-[#E2B957]/35 bg-[#0a1b33]/85 p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E2B957]/20 pb-2.5">
                <span className="rounded-full bg-[#E2B957]/20 border border-[#E2B957]/50 px-3 py-0.5 text-xs font-black uppercase tracking-widest text-accent-300">
                  Zona 1
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-200">
                  Wilayah 1
                </span>
              </div>

              {slotW1.map((s) => (
                <div key={s.kode} className="mt-4">
                  <span className="text-[10px] font-black tracking-widest text-[#E2B957] uppercase block">
                    Pemenang Terpilih
                  </span>
                  <h3 className="mt-1 text-2xl sm:text-3xl font-black text-neutral-0 uppercase tracking-wide drop-shadow-sm">
                    {s.pemenang.nama}
                  </h3>

                  <div className="mt-4 space-y-1.5 rounded-xl border border-primary-700/50 bg-[#051122]/70 p-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-primary-200">
                      <span className="text-neutral-400 font-sans">NOP:</span>
                      <span className="font-bold text-accent-300 tracking-wider text-sm">{s.pemenang.nopMasked}</span>
                    </div>
                    <div className="flex items-center justify-between text-primary-200">
                      <span className="text-neutral-400 font-sans">Kecamatan:</span>
                      <span className="font-bold text-neutral-100 text-sm">{s.pemenang.kecamatan.toUpperCase()}</span>
                    </div>
                    {s.pemenang.kelurahan && (
                      <div className="flex items-center justify-between text-primary-200">
                        <span className="text-neutral-400 font-sans">Desa/Kel:</span>
                        <span className="text-neutral-200">{s.pemenang.kelurahan}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zona 2 */}
          <div className="relative overflow-hidden rounded-2xl border border-[#E2B957]/35 bg-[#0a1b33]/85 p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E2B957]/20 pb-2.5">
                <span className="rounded-full bg-[#E2B957]/20 border border-[#E2B957]/50 px-3 py-0.5 text-xs font-black uppercase tracking-widest text-accent-300">
                  Zona 2
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-200">
                  Wilayah 2
                </span>
              </div>

              {slotW2.map((s) => (
                <div key={s.kode} className="mt-4">
                  <span className="text-[10px] font-black tracking-widest text-[#E2B957] uppercase block">
                    Pemenang Terpilih
                  </span>
                  <h3 className="mt-1 text-2xl sm:text-3xl font-black text-neutral-0 uppercase tracking-wide drop-shadow-sm">
                    {s.pemenang.nama}
                  </h3>

                  <div className="mt-4 space-y-1.5 rounded-xl border border-primary-700/50 bg-[#051122]/70 p-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-primary-200">
                      <span className="text-neutral-400 font-sans">NOP:</span>
                      <span className="font-bold text-accent-300 tracking-wider text-sm">{s.pemenang.nopMasked}</span>
                    </div>
                    <div className="flex items-center justify-between text-primary-200">
                      <span className="text-neutral-400 font-sans">Kecamatan:</span>
                      <span className="font-bold text-neutral-100 text-sm">{s.pemenang.kecamatan.toUpperCase()}</span>
                    </div>
                    {s.pemenang.kelurahan && (
                      <div className="flex items-center justify-between text-primary-200">
                        <span className="text-neutral-400 font-sans">Desa/Kel:</span>
                        <span className="text-neutral-200">{s.pemenang.kelurahan}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidik Digital Ringkas (Ukuran Kecil & Elegan) */}
        <div className="rounded-xl border border-primary-700/40 bg-[#051122]/75 p-3.5 backdrop-blur-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 shrink-0 text-accent-400 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-primary-300 uppercase tracking-wider block">
                  Hash Snapshot Peserta
                </span>
                <p className="font-mono text-xs font-bold text-accent-300">
                  {formatHashRingkas(snapshotHash)}
                </p>
                <p className="font-mono text-[9px] text-neutral-400 truncate" title={snapshotHash}>
                  {snapshotHash || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 shrink-0 text-secondary-400 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-secondary-300 uppercase tracking-wider block">
                  Hash File Hasil Undian
                </span>
                <p className="font-mono text-xs font-bold text-secondary-300">
                  {formatHashRingkas(hasilHash)}
                </p>
                <p className="font-mono text-[9px] text-neutral-400 truncate" title={hasilHash}>
                  {hasilHash || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Aksi Bawah */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={onUnduhHasil}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-600 px-8 text-base font-bold text-neutral-0 shadow-lg hover:bg-secondary-500 transition-all border border-secondary-400/50 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
          >
            <Download className="size-5" />
            Unduh File Hasil Undian (.json)
          </button>

          {onResetUndian && (
            <button
              type="button"
              onClick={onResetUndian}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-danger-700 bg-neutral-900/90 px-6 text-base font-bold text-danger-300 shadow-sm hover:bg-danger-950/70 hover:text-neutral-0 transition-all focus:outline-none focus:ring-2 focus:ring-danger-600 focus:ring-offset-2 focus:ring-offset-neutral-900"
            >
              <RotateCcw className="size-5" />
              Ulangi Pengundian
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
