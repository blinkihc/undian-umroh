import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { KontenBeranda } from '@/components/publik/beranda/konten-beranda';
import { JUDUL_ACARA_DEFAULT, PENYELENGGARA } from '@/config/brand';
import { ambilRingkasanBeranda } from '@/server/services/beranda';

export const metadata: Metadata = {
  title: `Apresiasi Akbar PBB-P2 2026 • ${PENYELENGGARA}`,
  description:
    'Penghargaan tertinggi bagi Wajib Pajak PBB-P2 teladan Kabupaten OKU Selatan lunas 5 tahun berturut-turut. Dua jemaah diberangkatkan ke Tanah Suci melalui undian berintegritas tinggi.',
};

export const dynamic = 'force-dynamic';

export default async function BerandaPage(): Promise<ReactElement> {
  const ringkasan = await ambilRingkasanBeranda();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#072d1a] via-[#0a3822] to-[#052113] text-white selection:bg-emerald-600 selection:text-white relative">
      {/* Pola ornamen geometris list putih islami */}
      <div
        className="absolute inset-0 pattern-islamic-white opacity-[0.16] pointer-events-none"
        aria-hidden="true"
      />
      {/* Ornamen garis geometris list putih di tepian atas */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" 
        aria-hidden="true" 
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-24">
        <KontenBeranda ringkasan={ringkasan} />
      </div>
    </div>
  );
}
