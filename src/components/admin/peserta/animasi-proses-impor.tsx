'use client';

import { animate, createTimeline, stagger } from 'animejs';
import {
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Lock,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

type AnimasiProsesImporProps = {
  tahap: 'mengunggah' | 'memproses';
  kemajuan: number; // 0 sampai 1
};

const TAHAPAN = [
  {
    id: 1,
    judul: '1. Pemindaian & Pembacaan Struktur Berkas',
    deskripsi: 'Membaca baris berkas ekspor PBB (CSV/XLSX) dan memvalidasi kolom NOP, NIK, dan Pelunasan.',
    ikon: FileSpreadsheet,
  },
  {
    id: 2,
    judul: '2. Validasi NOP & Evaluasi 5 Tahun (2022–2026)',
    deskripsi: 'Meneliti pelunasan berturut-turut tanpa tunggakan dan memisahkan Wajib Pajak Pribadi.',
    ikon: Search,
  },
  {
    id: 3,
    judul: '3. Enkripsi Kriptografis NIK (AES-256-GCM)',
    deskripsi: 'Mengamankan data identitas NIK sensitif dengan perlindungan enkripsi berstandar perbankan.',
    ikon: Lock,
  },
  {
    id: 4,
    judul: '4. Sinkronisasi Database & Pemetaan Wilayah',
    deskripsi: 'Menyimpan puluhan ribu rekor ke PostgreSQL dan mengagregasi data per kecamatan.',
    ikon: Database,
  },
] as const;

export function AnimasiProsesImpor({ tahap, kemajuan }: AnimasiProsesImporProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const persentaseRef = useRef<HTMLSpanElement>(null);
  const [faseAktif, setFaseAktif] = useState<number>(tahap === 'mengunggah' ? 1 : 2);
  const [detikBerjalan, setDetikBerjalan] = useState(0);

  // Timer hitung detik
  useEffect(() => {
    const interval = setInterval(() => {
      setDetikBerjalan((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sinkronisasi fase berdasarkan waktu dan tahap
  useEffect(() => {
    if (tahap === 'mengunggah') {
      setFaseAktif(1);
    } else {
      // Saat memproses di latar belakang, bertahap naik 2 -> 3 -> 4
      const timerFase = setTimeout(() => {
        setFaseAktif((f) => (f < 3 ? 3 : f));
      }, 5000);
      const timerFase4 = setTimeout(() => {
        setFaseAktif(4);
      }, 12000);
      return () => {
        clearTimeout(timerFase);
        clearTimeout(timerFase4);
      };
    }
  }, [tahap]);

  // Efek Anime.js untuk kemunculan kartu tahap dan denyut elemen
  useEffect(() => {
    if (!containerRef.current) return;

    // Stagger masuk kartu tahapan
    animate('.stage-card', {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: stagger(100),
      duration: 600,
      ease: 'outQuad',
    });

    // Partikel mengambang bergerak
    animate('.floating-particle', {
      translateY: [-6, 6],
      scale: [0.85, 1.15],
      duration: 2400,
      alternate: true,
      loop: true,
      delay: stagger(200),
      ease: 'inOutSine',
    });

    // Gelombang radar scanner
    animate('.radar-beam', {
      scaleX: [0.95, 1.05],
      opacity: [0.4, 0.8],
      duration: 1500,
      alternate: true,
      loop: true,
      ease: 'inOutQuad',
    });
  }, []);

  // Animasi progress bar dan angka persentase berbasis Anime.js
  useEffect(() => {
    if (!progressBarRef.current || !persentaseRef.current) return;

    let targetPersen = Math.round(kemajuan * 100);
    if (tahap === 'mengunggah') {
      // Mengunggah file berkisar 0-30%
      targetPersen = Math.min(30, Math.round(kemajuan * 30));
    } else {
      // Memproses di server bergerak 35% -> 65% -> 85% -> 94%
      if (faseAktif === 2) targetPersen = 45;
      else if (faseAktif === 3) targetPersen = 72;
      else if (faseAktif === 4) targetPersen = 94;
    }

    // Animasi lebar progress bar
    animate(progressBarRef.current, {
      width: `${targetPersen}%`,
      duration: 800,
      ease: 'outCubic',
    });

    // Counter angka persentase
    const obj = { val: parseInt(persentaseRef.current.innerText || '0', 10) || 0 };
    animate(obj, {
      val: targetPersen,
      duration: 800,
      round: 1,
      ease: 'outCubic',
      onUpdate: () => {
        if (persentaseRef.current) {
          persentaseRef.current.innerText = `${obj.val}%`;
        }
      },
    });
  }, [tahap, kemajuan, faseAktif]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl border border-primary-300 bg-gradient-to-b from-primary-50/70 via-neutral-0 to-primary-50/30 p-6 shadow-md transition-all"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Ornamen Latar Interaktif */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 size-48 rounded-full bg-emerald-200/40 blur-3xl" />

      {/* Header Animasi Status */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-primary-200/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-lg bg-primary-700 text-neutral-0 shadow-sm">
            <Sparkles className="size-5 animate-pulse" />
            <span className="radar-beam absolute inset-0 rounded-lg ring-2 ring-primary-500 ring-offset-1" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-800">
                <span className="size-2 rounded-full bg-primary-600 animate-ping" />
                LATAR BELAKANG AKTIF
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                {detikBerjalan}s berjalan
              </span>
            </div>
            <h3 className="font-heading text-base font-bold text-neutral-900 mt-1">
              {tahap === 'mengunggah'
                ? 'Mengunggah Berkas ke Server...'
                : 'Memproses Validasi & Enkripsi Data Peserta'}
            </h3>
          </div>
        </div>

        {/* Counter Persentase */}
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span
              ref={persentaseRef}
              className="font-mono text-2xl font-black text-primary-900"
            >
              0%
            </span>
          </div>
          <p className="text-xs text-neutral-600">Estimasi Kemajuan</p>
        </div>
      </div>

      {/* Custom Progress Bar dengan Anime.js */}
      <div className="relative my-5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-200 shadow-inner">
          <div
            ref={progressBarRef}
            className="h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 shadow-sm transition-[width]"
            style={{ width: '0%' }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-neutral-500 font-medium">
          <span>0% Mulai</span>
          <span>50% Enkripsi</span>
          <span>100% Selesai</span>
        </div>
      </div>

      {/* Tahapan Visual Realtime (4 Cards) */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Progres Tahapan Latar Belakang:
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {TAHAPAN.map((t) => {
            const Ikon = t.ikon;
            const selesai = faseAktif > t.id;
            const sedangAktif = faseAktif === t.id;

            return (
              <div
                key={t.id}
                className={`stage-card relative flex items-start gap-3 rounded-lg border p-3.5 transition-all ${
                  sedangAktif
                    ? 'border-primary-600 bg-neutral-0 ring-2 ring-primary-500/20 shadow-sm'
                    : selesai
                      ? 'border-emerald-300 bg-emerald-50/50 text-neutral-700'
                      : 'border-neutral-200 bg-neutral-50/60 opacity-60 text-neutral-500'
                }`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                    selesai
                      ? 'bg-emerald-600 text-neutral-0'
                      : sedangAktif
                        ? 'bg-primary-700 text-neutral-0 shadow-sm'
                        : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {selesai ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Ikon className={`size-4 ${sedangAktif ? 'animate-bounce' : ''}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-xs font-bold leading-tight ${
                        sedangAktif
                          ? 'text-primary-900'
                          : selesai
                            ? 'text-emerald-900'
                            : 'text-neutral-700'
                      }`}
                    >
                      {t.judul}
                    </h4>
                    {sedangAktif && (
                      <span className="inline-block size-2 rounded-full bg-primary-600 animate-ping" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 line-clamp-2">
                    {t.deskripsi}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Partikel Indikator Aliran Data */}
      <div className="mt-4 flex items-center justify-center gap-1.5 py-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className="floating-particle inline-block size-2 rounded-full bg-primary-500/60"
          />
        ))}
      </div>

      {/* Peringatan & Info Jangan Tutup Halaman */}
      <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
        <span className="font-semibold">Perhatian:</span>
        <span>
          Pemrosesan berkas besar (&gt;100.000 baris) membutuhkan waktu verifikasi 10–25 detik. Jangan menutup atau merefresh peramban hingga proses rampung.
        </span>
      </div>
    </div>
  );
}
