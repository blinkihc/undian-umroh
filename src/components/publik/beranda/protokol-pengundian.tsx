import { Lock, MapPin, ShieldCheck } from 'lucide-react';
import { type ReactElement } from 'react';

type ProtokolPengundianProps = {
  totalTiketSah?: number;
};

export function ProtokolPengundian({
  totalTiketSah = 26230,
}: ProtokolPengundianProps): ReactElement {
  const tiketFormatted = totalTiketSah > 0 ? totalTiketSah.toLocaleString('id-ID') : 'Terdata Riil';

  return (
    <section className="space-y-8" id="alur-resmi" aria-labelledby="judul-alur-resmi">
      {/* Judul Bagian & Pengesahan Bupati */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-champagne-400/20 pb-5">
        <div>
          <span className="font-mono text-xs text-champagne-400 uppercase tracking-widest block font-medium">
            ARSITEKTUR AKUNTABILITAS PUBLIK
          </span>
          <h2
            id="judul-alur-resmi"
            className="font-heading font-black text-2xl sm:text-3xl text-alabaster tracking-tight mt-1"
          >
            PROTOKOL TIGA TAHAP PENGUNDIAN RESMI
          </h2>
        </div>
        <div className="font-mono text-xs text-sand-200/90 bg-oasis-900/90 px-3.5 py-1.5 rounded-lg border border-champagne-400/25 self-start md:self-auto">
          KEPUTUSAN BUPATI OKU SELATAN NO. 18/BAPENDA/2026
        </div>
      </div>

      {/* Grid 3 Tahap Alur Transparansi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tahap 1: Verifikasi Kriptografis NOP */}
        <div className="bg-oasis-900/90 rounded-2xl border border-champagne-400/25 p-7 flex flex-col justify-between hover:border-champagne-400/50 transition-all duration-300 group shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-champagne-400/15 border border-champagne-400/30 flex items-center justify-center font-mono font-bold text-champagne-300 text-sm">
                01
              </span>
              <ShieldCheck className="w-6 h-6 text-champagne-400" />
            </div>
            <h3 className="font-heading font-bold text-xl text-alabaster">
              Verifikasi Kriptografis NOP
            </h3>
            <p className="text-sm text-sand-100/80 leading-relaxed">
              Basis data terpadu menyaring secara otomatis Wajib Pajak ber-NOP OKU Selatan (Prefiks 16.09) yang telah melunasi kewajiban PBB-P2 berturut-turut tanpa jeda dari tahun 2022 hingga 2026.
            </p>
          </div>
          <div className="pt-6 border-t border-champagne-400/15 mt-6 flex items-center justify-between text-xs font-mono">
            <span className="text-champagne-300 font-bold">{tiketFormatted} Kupon Sah</span>
            <span className="text-sand-300">Tanpa Pungutan Biaya</span>
          </div>
        </div>

        {/* Tahap 2: Distribusi 2 Kuota Wilayah */}
        <div className="bg-oasis-900/90 rounded-2xl border border-champagne-400/25 p-7 flex flex-col justify-between hover:border-champagne-400/50 transition-all duration-300 group shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-champagne-400/15 border border-champagne-400/30 flex items-center justify-center font-mono font-bold text-champagne-300 text-sm">
                02
              </span>
              <MapPin className="w-6 h-6 text-champagne-400" />
            </div>
            <h3 className="font-heading font-bold text-xl text-alabaster">
              Distribusi 2 Kuota Wilayah
            </h3>
            <p className="text-sm text-sand-100/80 leading-relaxed">
              Keadilan proporsional terbagi atas 2 Zona Terpisah: <strong className="text-champagne-300">Zona I (Muaradua &amp; Hinterland)</strong> dan <strong className="text-champagne-300">Zona II (Danau Ranau &amp; Pesisir)</strong>, masing-masing memperebutkan 1 tiket Umroh independen.
            </p>
          </div>
          <div className="pt-6 border-t border-champagne-400/15 mt-6 flex items-center justify-between text-xs font-mono">
            <span className="text-champagne-300 font-bold">Peluang Berimbang</span>
            <span className="text-sand-300">19 Kecamatan Terpetakan</span>
          </div>
        </div>

        {/* Tahap 3: Segel Notaris & SHA-256 */}
        <div className="bg-oasis-900/90 rounded-2xl border border-champagne-400/25 p-7 flex flex-col justify-between hover:border-champagne-400/50 transition-all duration-300 group shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-champagne-400/15 border border-champagne-400/30 flex items-center justify-center font-mono font-bold text-champagne-300 text-sm">
                03
              </span>
              <Lock className="w-6 h-6 text-champagne-400" />
            </div>
            <h3 className="font-heading font-bold text-xl text-alabaster">
              Segel Notaris &amp; SHA-256
            </h3>
            <p className="text-sm text-sand-100/80 leading-relaxed">
              Penarikan nomor disaksikan langsung oleh Notaris, Dinas Sosial, dan Aparat Penegak Hukum menggunakan generator bilangan acak kriptografis (CSPRNG) dengan segel hash digital audit.
            </p>
          </div>
          <div className="pt-6 border-t border-champagne-400/15 mt-6 flex items-center justify-between text-xs font-mono">
            <span className="text-champagne-300 font-bold">Nir-Intervensi</span>
            <span className="text-sand-300">Terbuka Untuk Publik</span>
          </div>
        </div>
      </div>
    </section>
  );
}
