'use client';

import { Award, CheckCircle2, Gavel } from 'lucide-react';
import { type ReactElement } from 'react';

type KartuTiketPassProps = {
  nopMasked?: string;
  kodeKupon?: string;
  wilayah?: string;
  statusLolos?: boolean;
  tahunLunas?: { tahun: string; lunas: boolean; utama?: boolean }[];
};

const DEFAULT_TAHUN = [
  { tahun: "'22", lunas: true },
  { tahun: "'23", lunas: true },
  { tahun: "'24", lunas: true },
  { tahun: "'25", lunas: true },
  { tahun: "'26", lunas: true, utama: true },
];

export function KartuTiketPass({
  nopMasked = '16.09.030.003.***',
  kodeKupon = '#OKUS-2026-08192',
  wilayah = 'Zona I • Muaradua Raya',
  statusLolos = true,
  tahunLunas = DEFAULT_TAHUN,
}: KartuTiketPassProps): ReactElement {
  return (
    <div className="relative w-full max-w-md group" id="ticket-pass-container">
      {/* Pendaran Kemilau Emas Kerajaan */}
      <div
        className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-champagne-400/25 via-transparent to-champagne-300/20 blur-xl -z-10 transition-opacity duration-300 group-hover:opacity-100 opacity-70"
        aria-hidden="true"
      />

      {/* Badan Tiket Boarding Pass */}
      <div className="pass-paper rounded-3xl overflow-hidden relative p-6 sm:p-7 space-y-6 text-alabaster watermark-islamic border border-champagne-400/35 transition-transform duration-300 motion-safe:group-hover:-translate-y-1">
        {/* Lapisan Kilau Hologram Berjalan */}
        <div className="absolute inset-0 holo-sheen pointer-events-none opacity-40" aria-hidden="true" />

        {/* Header Tiket: Lambang & Insignia */}
        <div className="flex items-center justify-between border-b border-champagne-400/20 pb-5 relative z-10">
          <div>
            <h3 className="font-heading font-extrabold text-2xl tracking-tight text-alabaster">
              TIKET KE TANAH SUCI
            </h3>
          </div>

          {/* Insignia Emas Lambang Kemegahan */}
          <div className="w-12 h-12 rounded-2xl bg-oasis-950/80 border border-champagne-400/40 p-2.5 flex items-center justify-center text-champagne-400 shadow-inner shrink-0">
            <Award className="w-full h-full text-champagne-400" />
          </div>
        </div>

        {/* Informasi Utama Objek Pajak & Wilayah */}
        <div className="space-y-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-oasis-950/70 rounded-xl p-3.5 border border-champagne-400/15">
              <span className="font-mono text-[10px] text-champagne-400/80 uppercase tracking-wider block">
                NOMOR OBJEK PAJAK (NOP)
              </span>
              <span className="font-mono text-sm font-bold text-alabaster mt-1 block tracking-wider angka-tabular">
                {nopMasked}
              </span>
            </div>
            <div className="bg-oasis-950/70 rounded-xl p-3.5 border border-champagne-400/15">
              <span className="font-mono text-[10px] text-champagne-400/80 uppercase tracking-wider block">
                ALOKASI WILAYAH
              </span>
              <span className="font-heading text-sm font-bold text-champagne-300 mt-1 block truncate">
                {wilayah}
              </span>
            </div>
          </div>

          {/* Matriks 5 Tahun Berturut-turut Lunas PBB-P2 */}
          <div className="p-3.5 bg-oasis-950/70 rounded-xl border border-champagne-400/15 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-sand-200">VERIFIKASI LUNAS 5 TAHUN PENUH:</span>
              {statusLolos ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> TERVALIDASI
                </span>
              ) : (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  BELUM LENGKAP
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2 text-center font-mono text-[11px]">
              {tahunLunas.map((item) => (
                <div
                  key={item.tahun}
                  className={`py-1.5 rounded-lg border font-bold transition-all ${
                    item.utama
                      ? 'bg-gradient-to-b from-champagne-400 to-champagne-600 text-oasis-950 border-champagne-300 shadow-md'
                      : item.lunas
                      ? 'bg-champagne-400/15 border-champagne-400/40 text-champagne-300'
                      : 'bg-oasis-950/50 border-white/10 text-white/40'
                  }`}
                >
                  {item.tahun} {item.lunas ? (item.utama ? '★' : '✓') : '—'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cekungan Perforasi Karcis (Stub Notch Separator) */}
        <div className="relative py-1 flex items-center justify-between" aria-hidden="true">
          <div className="w-6 h-6 -ml-9 sm:-ml-10 rounded-full bg-oasis-900 border-r border-champagne-400/30" />
          <div className="flex-1 border-t-2 border-dashed border-champagne-400/25 mx-2" />
          <div className="w-6 h-6 -mr-9 sm:-mr-10 rounded-full bg-oasis-900 border-l border-champagne-400/30" />
        </div>

        {/* Keamanan & Validasi Digital Kriptografis */}
        <div className="flex items-center justify-between pt-1 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-1 h-5" aria-label="Visual Barcode Kriptografis">
              <span className="w-1 h-full bg-champagne-300" />
              <span className="w-0.5 h-full bg-white" />
              <span className="w-1.5 h-full bg-champagne-400" />
              <span className="w-0.5 h-full bg-white" />
              <span className="w-2 h-full bg-champagne-300" />
              <span className="w-0.5 h-full bg-white" />
              <span className="w-1 h-full bg-champagne-400" />
              <span className="w-1.5 h-full bg-white" />
              <span className="w-0.5 h-full bg-champagne-300" />
              <span className="w-2 h-full bg-champagne-400" />
            </div>
            <span className="font-mono text-[9px] text-sand-300 tracking-widest block uppercase">
              CSPRNG ENCRYPTED PASS KEY
            </span>
          </div>

          <div className="text-right">
            <span className="font-mono text-[9px] text-sand-300 uppercase block">
              SAKSI &amp; PENGAWAS
            </span>
            <span className="font-mono text-xs font-bold text-champagne-400 uppercase tracking-wider">
              NOTARIS • DINSOS SUMSEL
            </span>
          </div>
        </div>
      </div>

      {/* Catatan Kaki Legal */}
      <div className="flex items-center justify-center gap-2 text-center text-xs font-mono text-sand-200/70 mt-3">
        <Gavel className="w-3.5 h-3.5 text-champagne-400" />
        <span>Setiap kupon dijamin hak setara sesuai Keputusan Bupati</span>
      </div>
    </div>
  );
}
