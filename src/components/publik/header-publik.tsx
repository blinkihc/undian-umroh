import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { type ReactElement } from 'react';

import { LogoResmi } from '@/components/ui/logo-resmi';

/** Header publik editorial resmi: lambang Pemkab & Bapenda di atas pelat putih (DESIGN_SYSTEM §2, §11). */
export function HeaderPublik(): ReactElement {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/65 backdrop-blur-xl border-b border-white/20 shadow-xl text-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Identitas Lambang & Pemerintah Daerah */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Pelat putih resmi untuk logo (DESIGN_SYSTEM §2) */}
            <div className="bg-white/95 rounded-md p-1.5 shadow-md border border-white/40 flex items-center justify-center shrink-0">
              <LogoResmi tinggiOkus={32} />
            </div>

            <div className="hidden sm:block">
              <div>
                <span className="font-heading font-extrabold text-xs sm:text-sm tracking-wider text-white uppercase drop-shadow-xs">
                  PEMERINTAH KABUPATEN OKU SELATAN
                </span>
              </div>
              <span className="font-mono text-[11px] text-emerald-300 font-bold tracking-wider block">
                BADAN PENDAPATAN DAERAH
              </span>
            </div>
          </Link>
        </div>

        {/* Tautan Navigasi & Tindakan Cepat (Tidak ada duplikasi fungsi) */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav aria-label="Navigasi Publik" className="hidden md:flex items-center gap-1 sm:gap-2 text-xs font-mono font-medium text-white/85">
            <Link
              href="#kuota-zona"
              className="rounded-lg px-2.5 sm:px-3 py-1.5 hover:text-white hover:bg-white/10 transition-colors"
            >
              Alokasi Kuota
            </Link>
            <Link
              href="#syarat"
              className="rounded-lg px-2.5 sm:px-3 py-1.5 hover:text-white hover:bg-white/10 transition-colors"
            >
              Syarat Sah
            </Link>
            <Link
              href="#audit-hash"
              className="rounded-lg px-2.5 sm:px-3 py-1.5 hover:text-white hover:bg-white/10 transition-colors"
            >
              Audit Digital
            </Link>
            <Link
              href="#faq"
              className="rounded-lg px-2.5 sm:px-3 py-1.5 hover:text-white hover:bg-white/10 transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/pemenang"
              className="rounded-lg px-2.5 sm:px-3 py-1.5 hover:text-white hover:bg-white/10 transition-colors"
            >
              Pemenang
            </Link>
          </nav>

          <Link
            href="#terminal-cek"
            style={{ color: '#ffffff' }}
            className="px-4 py-2.5 rounded-xl bg-primary-700 hover:bg-primary-600 !text-white font-heading font-bold text-xs tracking-wider uppercase shadow-md transition-all flex items-center gap-1.5 shrink-0 border border-white/40 ring-1 ring-white/20 active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>Cek NOP</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
