import { MessageSquare, Shield } from 'lucide-react';
import { type ReactElement } from 'react';

export function JaminanLayanan(): ReactElement {
  return (
    <section className="rounded-3xl bg-oasis-900/60 border border-champagne-400/20 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="space-y-2 text-center md:text-left">
        <div className="inline-flex items-center gap-2 text-champagne-400 font-mono text-xs">
          <Shield className="w-4 h-4 text-champagne-400" />
          <span className="font-bold">KERAHASIAAN DATA WAJIB PAJAK TERJAMIN UU NO. 27/2022 (UU PDP)</span>
        </div>
        <h3 className="font-heading font-bold text-xl sm:text-2xl text-alabaster">
          Konsultasi Rekonsiliasi NOP &amp; STS Bank Sumsel Babel
        </h3>
        <p className="text-sm text-sand-100/80 max-w-xl leading-relaxed">
          Apabila terdapat ketidaksesuaian riwayat bayar pada lembar SPPT Anda, kunjungi Command
          Center Bapenda OKU Selatan di Komplek Perkantoran Pemkab Muaradua.
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <a
          href="https://wa.me/6281278902026"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3.5 rounded-xl bg-alabaster hover:bg-sand-100 text-oasis-950 font-heading font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 shadow-royal transition-all cursor-pointer hover:brightness-105 active:scale-95"
        >
          <MessageSquare className="w-4 h-4 text-oasis-800" />
          <span>Hubungi Bapenda OKUS</span>
        </a>
      </div>
    </section>
  );
}
