import { Award, CheckCircle2 } from 'lucide-react';
import { type ReactElement } from 'react';

export function KuotaWilayah(): ReactElement {
  return (
    <section className="space-y-6 scroll-mt-24 my-8" id="kuota-zona" aria-labelledby="judul-kuota">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/20 pb-4">
        <div>
          <span className="font-mono text-xs text-emerald-300 font-bold uppercase tracking-wider block">
            DISTRIBUSI KUOTA HADIAH
          </span>
          <h2
            id="judul-kuota"
            className="font-heading font-extrabold text-2xl sm:text-3xl text-white mt-1"
          >
            Alokasi Wilayah Undian Umroh
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-md text-left sm:text-right">
          Setiap zona memiliki 1 pemenang utama yang diundi secara independen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KARTU ZONA 1 */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#082e1c]/80 backdrop-blur-md border-2 border-white/30 shadow-2xl hover:border-white/50 text-white transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/40 font-mono text-xs font-bold">
                Zona 1
              </span>
              <h3 className="font-heading font-black text-2xl sm:text-3xl text-white mt-3 leading-tight">
                1 Paket Umroh Penuh
              </h3>
              <p className="text-xs text-emerald-100/80 mt-1.5 font-medium">
                1 Pemenang Utama Terpilih
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border-2 border-amber-300/50 text-amber-300 flex items-center justify-center shrink-0 shadow-lg">
              <Award className="w-7 h-7" />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/15 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-white/90">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Diundi Independen</span>
            </div>
            <span className="text-amber-300 font-bold">1 Tiket Utama</span>
          </div>
        </div>

        {/* KARTU ZONA 2 */}
        <div className="rounded-3xl p-6 sm:p-8 bg-[#082e1c]/80 backdrop-blur-md border-2 border-white/30 shadow-2xl hover:border-white/50 text-white transition-all duration-300">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 font-mono text-xs font-bold">
                Zona 2
              </span>
              <h3 className="font-heading font-black text-2xl sm:text-3xl text-white mt-3 leading-tight">
                1 Paket Umroh Penuh
              </h3>
              <p className="text-xs text-emerald-100/80 mt-1.5 font-medium">
                1 Pemenang Utama Terpilih
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-emerald-400/15 border-2 border-emerald-300/50 text-emerald-300 flex items-center justify-center shrink-0 shadow-lg">
              <Award className="w-7 h-7" />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/15 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-white/90">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Diundi Independen</span>
            </div>
            <span className="text-emerald-300 font-bold">1 Tiket Utama</span>
          </div>
        </div>
      </div>
    </section>
  );
}
