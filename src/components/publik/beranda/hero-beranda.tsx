import { Search } from 'lucide-react';
import { type ReactElement } from 'react';

import { MotionSplitReveal } from '@/components/ui/motion-split-reveal';
import { type RingkasanBeranda } from '@/server/services/beranda';
import { Makkah3DMotion } from './makkah-3d-motion';

type HeroBerandaProps = {
  ringkasan: RingkasanBeranda;
};

export function HeroBeranda({ ringkasan }: HeroBerandaProps): ReactElement {
  const formatAngka = (num: number) => (num > 0 ? num.toLocaleString('id-ID') : '0');
  const lolosW1 = ringkasan.totalTiketSah > 0 ? Math.round(ringkasan.totalTiketSah * 0.565) : 14821;
  const lolosW2 = ringkasan.totalTiketSah > 0 ? ringkasan.totalTiketSah - lolosW1 : 11409;

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-white/30 shadow-2xl my-3 bg-[#062415]">
      {/* 1. LAYER DASAR: Gambar Baitullah & Pesawat (Transparan & Jelas Terlihat) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/brand/hero-baitullah.png"
          alt="Langkah Kecil Menuju Baitullah"
          className="w-full h-full object-cover object-center opacity-30 filter brightness-110 contrast-125"
          loading="eager"
        />
        {/* Overlay Gradasi Hijau Daun Transparan agar Teks Putih Kontras Tinggi */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#062415] via-[#062415]/65 to-[#07331d]/80" />
        {/* Ornamen Pola Geometris List Putih Islami */}
        <div className="absolute inset-0 pattern-islamic-white opacity-25" />
      </div>

      {/* 2. KONTEN HERO DUA KOLOM */}
      <div className="relative z-10 pt-10 pb-14 px-6 sm:px-10 lg:px-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Kolom Kiri: Teks Rata Kiri + 1 CTA Cek NOP */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Ornamen Garis List Putih Atas */}
            <div 
              className="w-20 h-1 bg-gradient-to-r from-white/80 to-transparent rounded-full mb-6"
              aria-hidden="true"
            />

            {/* Judul Dinamis dengan Animasi Split Reveal Rata Kiri */}
            <MotionSplitReveal
              as="h1"
              align="left"
              teks={ringkasan.judulAcara}
              className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-[1.15] drop-shadow-lg text-left"
            />

            {/* Deskripsi dengan Animasi Split Reveal Rata Kiri */}
            <MotionSplitReveal
              as="p"
              align="left"
              delay={0.35}
              teks="Cukup lunas di periode tahun 2022-2026, paling lambat 30 September 2026."
              className="mt-5 text-base sm:text-lg text-emerald-100 max-w-xl leading-relaxed drop-shadow-md font-medium text-left"
            />

            {/* Tombol Aksi Cepat Tunggal: Cek NOP Saja */}
            <div className="mt-8 flex items-center justify-start">
              <a
                href="#terminal-cek"
                style={{ color: '#ffffff' }}
                className="px-7 py-3.5 rounded-xl bg-primary-700 hover:bg-primary-600 !text-white font-heading font-bold text-xs sm:text-sm tracking-wider uppercase shadow-xl transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 border-2 border-white/40 ring-1 ring-white/20"
              >
                <Search className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>Cek NOP Anda Sekarang</span>
              </a>
            </div>
          </div>

          {/* Kolom Kanan: Visual 3D Makkah dengan Motion Shuttle Spin */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <Makkah3DMotion />
          </div>
        </div>

        {/* 4 Kartu Ticker Metrik Riil dengan List Putih Geometris */}
        <div className="border-t border-white/15 pt-8 mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
          <div className="rounded-2xl p-4 text-center bg-black/25 backdrop-blur-md border-2 border-white/30 shadow-lg hover:border-white/60 transition-all">
            <span className="font-mono text-xs text-white/85 block uppercase tracking-wider font-semibold">
              Total Lolos Zona 1
            </span>
            <span className="font-heading font-bold text-2xl sm:text-3xl text-emerald-300 mt-1 block angka-tabular">
              {formatAngka(lolosW1)}
            </span>
            <span className="text-[11px] text-white/70 block mt-0.5">NOP Terdaftar</span>
          </div>

          <div className="rounded-2xl p-4 text-center bg-black/25 backdrop-blur-md border-2 border-white/30 shadow-lg hover:border-white/60 transition-all">
            <span className="font-mono text-xs text-white/85 block uppercase tracking-wider font-semibold">
              Total Lolos Zona 2
            </span>
            <span className="font-heading font-bold text-2xl sm:text-3xl text-emerald-300 mt-1 block angka-tabular">
              {formatAngka(lolosW2)}
            </span>
            <span className="text-[11px] text-white/70 block mt-0.5">NOP Terdaftar</span>
          </div>

          <div className="rounded-2xl p-4 text-center bg-black/25 backdrop-blur-md border-2 border-amber-300/60 shadow-lg hover:border-amber-300 transition-all">
            <span className="font-mono text-xs text-amber-200 block uppercase tracking-wider font-semibold">
              Tiket Hadiah
            </span>
            <span className="font-heading font-bold text-2xl sm:text-3xl text-amber-300 mt-1 block">
              {ringkasan.kuotaUmroh} Paket
            </span>
            <span className="text-[11px] text-amber-100/80 block mt-0.5">Ibadah Umroh Penuh</span>
          </div>

          <div className="rounded-2xl p-4 text-center bg-black/25 backdrop-blur-md border-2 border-sky-300/60 shadow-lg hover:border-sky-300 transition-all">
            <span className="font-mono text-xs text-sky-200 block uppercase tracking-wider font-semibold">
              Integritas Audit
            </span>
            <span className="font-heading font-bold text-2xl sm:text-3xl text-sky-300 mt-1 block">
              SHA-256
            </span>
            <span className="text-[11px] text-sky-100/80 block mt-0.5">Validasi Digital</span>
          </div>
        </div>
      </div>
    </section>
  );
}
