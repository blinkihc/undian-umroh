import { type ReactElement } from 'react';

import { LogoResmi } from '@/components/ui/logo-resmi';
import { PENYELENGGARA } from '@/config/brand';

export function FooterPublik(): ReactElement {
  return (
    <footer className="relative bg-slate-900/65 backdrop-blur-xl border-t border-white/20 shadow-2xl py-12 px-4 sm:px-6 text-white text-xs font-mono overflow-hidden">
      {/* Garis ornamen list putih metalik di batas atas */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          {/* Pelat putih logo resmi senada dengan Header */}
          <div className="bg-white/95 rounded-md p-1.5 shadow-md border border-white/40 flex items-center justify-center shrink-0">
            <LogoResmi tinggiOkus={32} />
          </div>

          <div className="space-y-1">
            <p className="font-heading font-extrabold text-xs sm:text-sm tracking-wider text-white uppercase drop-shadow-xs">
              PEMERINTAH KABUPATEN OKU SELATAN
            </p>
            <p className="font-mono text-[11px] text-emerald-300 font-bold tracking-wider">
              {PENYELENGGARA.toUpperCase()}
            </p>
            <p className="text-[11px] text-slate-300">
              © 2026 Seluruh Hak Dilindungi. Program Apresiasi Umroh Taat Pajak PBB-P2.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-bold">
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300 border border-emerald-500/40 shadow-xs">
            ENKRIPSI CSPRNG
          </span>
          <span className="text-white/40">•</span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300 border border-emerald-500/40 shadow-xs">
            HASH SHA-256 AUDITED
          </span>
          <span className="text-white/40">•</span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300 border border-emerald-500/40 shadow-xs">
            KONTRAK RESMI APBD
          </span>
        </div>
      </div>
    </footer>
  );
}
