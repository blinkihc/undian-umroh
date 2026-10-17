import { type ReactElement } from 'react';

export function KriteriaPeserta(): ReactElement {
  return (
    <section className="space-y-6 scroll-mt-24 my-8" id="syarat" aria-labelledby="judul-syarat">
      <div className="text-center max-w-xl mx-auto">
        <span className="font-mono text-xs text-emerald-300 font-bold tracking-wider uppercase block">
          REGULASI RESMI
        </span>
        <h3
          id="judul-syarat"
          className="font-heading font-extrabold text-2xl sm:text-3xl text-white mt-1"
        >
          4 Syarat Sah Kepesertaan
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kriteria 01: Revisi 3 Sesuai Permintaan User */}
        <div className="rounded-2xl p-5 bg-[#082e1c]/80 backdrop-blur-md border-2 border-white/25 shadow-xl hover:border-white/50 transition-all flex items-start gap-3.5 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/15 text-white border-2 border-white/40 flex items-center justify-center shrink-0 font-mono font-bold text-sm shadow-md">
            01
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-white">Wajib Pajak Pribadi</h4>
            <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
              Khusus perorangan (bukan Badan Usaha, Perusahaan, dll).
            </p>
          </div>
        </div>

        {/* Kriteria 02 */}
        <div className="rounded-2xl p-5 bg-[#082e1c]/80 backdrop-blur-md border-2 border-white/25 shadow-xl hover:border-white/50 transition-all flex items-start gap-3.5 text-white">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-200 border-2 border-emerald-300/40 flex items-center justify-center shrink-0 font-mono font-bold text-sm shadow-md">
            02
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-white">Lunas 5 Tahun Penuh</h4>
            <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
              Bebas tunggakan tahun 2022 s/d 2026 berturut-turut tanpa jeda.
            </p>
          </div>
        </div>

        {/* Kriteria 03 */}
        <div className="rounded-2xl p-5 bg-[#082e1c]/80 backdrop-blur-md border-2 border-white/25 shadow-xl hover:border-white/50 transition-all flex items-start gap-3.5 text-white">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-200 border-2 border-amber-300/40 flex items-center justify-center shrink-0 font-mono font-bold text-sm shadow-md">
            03
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-white">Sebelum Jatuh Tempo</h4>
            <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
              Pelunasan tahun 2026 diselesaikan sebelum batas jatuh tempo.
            </p>
          </div>
        </div>

        {/* Kriteria 04 */}
        <div className="rounded-2xl p-5 bg-[#082e1c]/80 backdrop-blur-md border-2 border-white/25 shadow-xl hover:border-white/50 transition-all flex items-start gap-3.5 text-white">
          <div className="w-10 h-10 rounded-xl bg-sky-400/20 text-sky-200 border-2 border-sky-300/40 flex items-center justify-center shrink-0 font-mono font-bold text-sm shadow-md">
            04
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-white">1 NOP = 1 Hak Undi</h4>
            <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
              Satu kupon unik matematis tanpa kelipatan saldo atau nilai pajak.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
