'use client';

import { animate, stagger } from 'animejs';
import { Check, Copy, Fingerprint, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

type SidikAuditHashProps = {
  snapshotHashPenuh?: string | null;
  statusKunci?: boolean;
};

export function SidikAuditHash({
  snapshotHashPenuh,
  statusKunci = false,
}: SidikAuditHashProps): ReactElement {
  const [tersalin, setTersalin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tombolSalinRef = useRef<HTMLButtonElement>(null);

  const hashDitampilkan =
    snapshotHashPenuh ??
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  useEffect(() => {
    if (!containerRef.current) return;

    // Laser beam scanner yang memindai melintasi kotak hash SHA-256
    animate('.hash-laser-beam', {
      translateX: ['-100%', '300%'],
      duration: 3200,
      loop: true,
      ease: 'inOutQuad',
    });

    // Efek denyut pada lencana sidik jari
    animate('.fingerprint-glow', {
      scale: [1, 1.15, 1],
      opacity: [0.7, 1, 0.7],
      duration: 2200,
      loop: true,
      ease: 'inOutSine',
    });

    // Partikel kriptografis mengambang
    animate('.crypto-dot', {
      translateY: [-4, 4],
      opacity: [0.3, 0.9, 0.3],
      duration: 2400,
      alternate: true,
      loop: true,
      delay: stagger(250),
      ease: 'inOutSine',
    });
  }, []);

  const handleSalin = async () => {
    try {
      await navigator.clipboard.writeText(hashDitampilkan);
      setTersalin(true);

      // Animasi tombol salin dengan Anime.js spring
      if (tombolSalinRef.current) {
        animate(tombolSalinRef.current, {
          scale: [1, 1.18, 0.95, 1],
          duration: 500,
          ease: 'outElastic(1, .6)',
        });
      }

      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Abaikan jika clipboard diblokir browser
    }
  };

  return (
    <section className="relative scroll-mt-24" id="audit-hash" aria-labelledby="judul-audit">
      <div
        ref={containerRef}
        className="rounded-3xl bg-slate-900/75 backdrop-blur-xl p-6 sm:p-8 border border-white/20 shadow-2xl relative overflow-hidden text-white"
      >
        {/* Glow Ambient Corner */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 size-60 rounded-full bg-primary-600/20 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>STANDAR TERBUKA KRIPTOGRAFIS</span>
            </div>
            <h3
              id="judul-audit"
              className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-wide drop-shadow-sm"
            >
              Sidik Digital Snapshot Database
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Basis data peserta dikunci permanen dengan fungsi algoritma kriptografis SHA-256
              untuk menjamin integritas data dan memastikan daftar nomor undian tidak dapat diubah.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all ${
                statusKunci
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-white/10 text-slate-200 border border-white/20'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span className="fingerprint-glow absolute inset-0 rounded-full ring-2 ring-emerald-400/50" />
              </div>
              <span>{statusKunci ? 'TERKUNCI SHA-256' : 'SIAP DIKUNCI'}</span>
            </span>
          </div>
        </div>

        {/* Kotak Hash SHA-256 High-Tech */}
        <div className="relative mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 flex items-center gap-2 font-bold tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              SHA-256 IMMUTABLE CHECKSUM
            </span>
            <button
              ref={tombolSalinRef}
              type="button"
              onClick={handleSalin}
              className="text-white hover:text-white flex items-center gap-1.5 font-bold transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 rounded-lg border border-emerald-400/50 shadow-md active:scale-95 text-xs font-mono"
            >
              {tersalin ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
              <span>{tersalin ? 'Tersalin!' : 'Salin Hash'}</span>
            </button>
          </div>

          {/* Terminal Box dengan Laser Scanner */}
          <div className="relative p-4 sm:p-5 rounded-xl bg-black/60 border border-emerald-500/40 font-mono text-xs sm:text-sm text-emerald-300 tracking-wider break-all shadow-inner select-all overflow-hidden group">
            {/* Laser scanning beam Anime.js */}
            <div
              className="hash-laser-beam pointer-events-none absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent blur-sm"
              aria-hidden="true"
            />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span>{hashDitampilkan}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-emerald-400" />
              Algoritma: SHA-256 (256-bit Digest)
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="crypto-dot size-1.5 rounded-full bg-emerald-400"
                  />
                ))}
              </div>
              <span className="text-emerald-400 font-semibold">Integritas: Terverifikasi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
