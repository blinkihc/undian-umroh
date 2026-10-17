'use client';

import { type ReactElement } from 'react';
import { type FaseUndian } from '@/lib/draw/types';

export type PresetAnimasi = 'slot-mesin' | 'roda-nama' | 'kartu-berputar' | 'ticker-nop';

export type PesertaAnimasi = {
  nama: string;
  nopMasked: string;
  wilayah?: string;
  kecamatan?: string;
};

interface AnimasiUndianProps {
  preset: PresetAnimasi;
  fase: FaseUndian;
  peserta: PesertaAnimasi;
  warnaAksen?: 'kuning' | 'hijau' | 'biru-muda';
  melambat?: boolean;
}

export function AnimasiUndian({
  preset,
  fase,
  peserta,
  warnaAksen = 'kuning',
  melambat = false,
}: AnimasiUndianProps): ReactElement {
  const isMengacak = fase === 'MENGACAK';

  // Gaya aksen warna dinamis sesuai token resmi DESIGN_SYSTEM.md (§3)
  const aksenText =
    warnaAksen === 'hijau'
      ? 'text-secondary-100'
      : warnaAksen === 'biru-muda'
        ? 'text-primary-100'
        : 'text-accent-400';

  const aksenBorder =
    warnaAksen === 'hijau'
      ? 'border-secondary-600'
      : warnaAksen === 'biru-muda'
        ? 'border-primary-500'
        : 'border-accent-400';

  const boxStyle = {
    backgroundColor: 'rgba(6, 42, 85, 0.85)', // primary-900 dengan proteksi solid terhadap tembus putih
  };

  // 1. PRESET: RODA NAMA (Vertical Spinning Wheel Roulette)
  if (preset === 'roda-nama') {
    return (
      <div className="relative my-4 flex w-full max-w-xl flex-col items-center justify-center">
        <div
          style={boxStyle}
          className={`relative h-44 w-full overflow-hidden rounded-xl border-2 ${aksenBorder} p-2 shadow-md`}
        >
          {/* Efek Bayangan Fade Silinder Roda */}
          <div
            style={{ background: 'linear-gradient(to bottom, #062a55 0%, rgba(6, 42, 85, 0) 100%)' }}
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12"
          />
          <div
            style={{ background: 'linear-gradient(to top, #062a55 0%, rgba(6, 42, 85, 0) 100%)' }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12"
          />

          {/* Indikator Penunjuk Tengah */}
          <div className="pointer-events-none absolute inset-y-0 left-3 z-20 flex items-center">
            <span className="text-xl font-black text-accent-400 drop-shadow-sm">▶</span>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-3 z-20 flex items-center">
            <span className="text-xl font-black text-accent-400 drop-shadow-sm">◀</span>
          </div>

          {/* Frame Sorotan Tengah */}
          <div
            className={`pointer-events-none absolute inset-x-8 top-1/2 z-10 h-14 -translate-y-1/2 rounded-lg border border-dashed ${
              warnaAksen === 'hijau'
                ? 'border-secondary-600/80 bg-secondary-600/20'
                : warnaAksen === 'biru-muda'
                  ? 'border-primary-500/80 bg-primary-700/30'
                  : 'border-accent-400/80 bg-accent-400/20'
            }`}
          />

          {/* Konten Putaran Roda */}
          <div className="flex h-full flex-col justify-center px-10 text-center">
            {/* Baris Atas */}
            <p className="truncate text-xs font-semibold text-primary-100 opacity-60">
              {isMengacak ? 'CALON PENERIMA UMROH' : '...'}
            </p>

            {/* Baris Tengah Utama (Fokus) */}
            <div className="my-1 py-1">
              <p
                className={`truncate text-lg sm:text-2xl font-black tracking-wider transition-all duration-75 ${
                  isMengacak ? `${aksenText} scale-105` : 'text-neutral-0'
                }`}
              >
                {isMengacak ? peserta.nama : 'SIAP MENGUNDI'}
              </p>
              <p className="truncate font-mono text-xs text-primary-100">
                {isMengacak ? peserta.nopMasked : 'Tekan Mulai untuk memutar roda'}
              </p>
            </div>

            {/* Baris Bawah */}
            <p className="truncate text-xs font-semibold text-primary-100 opacity-80">
              {isMengacak
                ? peserta.kecamatan
                  ? `KEC. ${peserta.kecamatan.toUpperCase()}`
                  : 'KABUPATEN OKU SELATAN'
                : '...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. PRESET: KARTU BERPUTAR (3D Perspective Flip Card)
  if (preset === 'kartu-berputar') {
    return (
      <div className="relative my-4 flex w-full max-w-lg flex-col items-center justify-center [perspective:1000px]">
        <div
          style={boxStyle}
          className={`relative h-44 w-full rounded-xl border-2 ${aksenBorder} p-5 text-center shadow-md transition-transform duration-150 ${
            isMengacak
              ? melambat
                ? '[transform:rotateX(15deg)_scale(1.02)]'
                : '[transform:rotateY(18deg)_rotateX(8deg)_scale(1.03)] shadow-xl'
              : ''
          }`}
        >
          {/* Badge Atas */}
          <div className="flex items-center justify-between border-b border-primary-700/80 pb-2 text-[10px] font-bold uppercase tracking-widest text-primary-100">
            <span>KARTU PESERTA</span>
            <span className={aksenText}>OKU SELATAN</span>
          </div>

          {/* Isi Kartu */}
          <div className="mt-3 flex flex-col items-center justify-center">
            <h3
              className={`max-w-full truncate text-xl sm:text-2xl font-black tracking-wide transition-all ${
                isMengacak ? `${aksenText} drop-shadow-sm` : 'text-neutral-0'
              }`}
            >
              {isMengacak ? peserta.nama : 'KARTU UNDIAN'}
            </h3>
            <p className="mt-1 font-mono text-xs sm:text-sm tracking-wider text-primary-100">
              {isMengacak ? peserta.nopMasked : 'Siap Diputar'}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {peserta.kecamatan && isMengacak && (
                <span className="rounded-full bg-accent-400/20 border border-accent-400/60 px-2.5 py-0.5 text-[10px] font-bold text-accent-300">
                  KEC. {peserta.kecamatan.toUpperCase()}
                </span>
              )}
              {peserta.wilayah && isMengacak && (
                <span className="rounded-full bg-primary-700 px-2.5 py-0.5 text-[10px] font-bold text-neutral-0">
                  {peserta.wilayah === 'W1' ? 'WILAYAH 1' : 'WILAYAH 2'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. PRESET: TICKER NOP (Scrambling Cipher / Odometer Digit NOP)
  if (preset === 'ticker-nop') {
    const nopText = isMengacak ? peserta.nopMasked : '16.09.000.000-0000.0';
    const nopTokens = nopText.split(/([.-])/);

    return (
      <div className="relative my-4 flex w-full max-w-xl flex-col items-center justify-center">
        <div
          style={boxStyle}
          className={`flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 ${aksenBorder} p-5 shadow-md`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent-400">
            PENGACAKAN DIGIT NOP (CIPHER SCRAMBLE)
          </p>

          {/* Deretan Digit Monospace */}
          <div className="my-3 flex flex-wrap items-center justify-center gap-1.5 font-mono text-sm sm:text-base font-black">
            {nopTokens.map((tok, i) => {
              if (tok === '.' || tok === '-') {
                return (
                  <span key={i} className="px-0.5 text-accent-400 font-bold">
                    {tok}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  style={{ backgroundColor: '#0f172a' }}
                  className={`rounded-md border border-primary-500/80 px-2 py-1 shadow-inner transition-colors ${
                    isMengacak ? 'text-accent-400 border-accent-400' : 'text-neutral-0'
                  }`}
                >
                  {tok}
                </span>
              );
            })}
          </div>

          {/* Nama Peserta & Kecamatan di Bawah Digit */}
          <div className="max-w-full truncate text-center">
            <p className={`truncate text-sm sm:text-base font-bold ${isMengacak ? 'text-neutral-0' : 'text-primary-100'}`}>
              {isMengacak ? peserta.nama : 'MENUNGGU PENGACAKAN'}
            </p>
            {isMengacak && peserta.kecamatan && (
              <p className="truncate font-mono text-xs font-semibold text-accent-400 mt-0.5">
                KEC. {peserta.kecamatan.toUpperCase()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. PRESET: SLOT MESIN (Default Slot Machine Ticker Drumroll)
  return (
    <div className="relative my-4 flex w-full max-w-xl flex-col items-center justify-center">
      <div
        style={boxStyle}
        className={`flex h-44 w-full items-center justify-center overflow-hidden rounded-xl border-2 ${aksenBorder} p-5 shadow-md`}
      >
        <div className="text-center px-4">
          <p
            className={`font-mono text-xl sm:text-2xl font-black tracking-wider transition-all duration-75 ${
              isMengacak ? `${aksenText} scale-105` : 'text-neutral-0'
            }`}
          >
            {isMengacak ? `${peserta.nama} • ${peserta.nopMasked}` : 'SIAP MENGUNDI'}
          </p>
          {isMengacak && peserta.kecamatan && (
            <p className="mt-1 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-accent-400">
              KEC. {peserta.kecamatan.toUpperCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

