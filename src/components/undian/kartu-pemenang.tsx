'use client';

import { type ReactElement } from 'react';

import { type PesertaUndian } from '@/lib/draw/types';
import { type KodeSlotPaket } from '@/lib/package/kontrak';

type KartuPemenangProps = {
  slotKode: KodeSlotPaket;
  slotLabel?: string;
  pemenang: PesertaUndian;
  ucapanPemenang?: string;
  warnaAksen?: 'kuning' | 'hijau' | 'biru-muda';
  onRayakan?: () => void;
};

function formatRingkasTanggalLunas(nilai: string | undefined): string {
  if (!nilai) return '-';
  const bagianTgl = nilai.split('T')[0];
  if (bagianTgl && /^\d{4}-\d{2}-\d{2}$/.test(bagianTgl)) {
    const [tahun, bulan, hari] = bagianTgl.split('-');
    return `${hari}/${bulan}/${tahun}`;
  }
  return nilai;
}

const TAHUN_LIST = ['2022', '2023', '2024', '2025', '2026'] as const;

export function KartuPemenang({
  slotKode,
  slotLabel,
  pemenang,
}: KartuPemenangProps): ReactElement {
  const labelZona =
    pemenang.wilayah === 'W1' || slotKode.includes('W1')
      ? 'Pemenang Zona 1'
      : pemenang.wilayah === 'W2' || slotKode.includes('W2')
        ? 'Pemenang Zona 2'
        : slotLabel ?? 'Pemenang';

  return (
    <div
      data-testid="kartu-pemenang"
      className="flex w-full max-w-4xl flex-col items-center text-slate-100"
    >
      {/* Monolit Kartu Utama: Imperial Midnight Sapphire & Gilded Arch Frame (Muat 1 Halaman) */}
      <div
        className="relative w-full overflow-hidden rounded-[26px] p-[1.5px] shadow-2xl transition-all"
        style={{
          background:
            'linear-gradient(145deg, #F8DF94 0%, #E2B957 24%, #6E4D0E 48%, #F6E7C1 72%, #A78028 100%)',
          boxShadow:
            '0 0 0 1px rgba(226, 185, 87, 0.35), 0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 50px -10px rgba(226, 185, 87, 0.2)',
        }}
      >
        <div className="relative overflow-hidden rounded-[24.5px] bg-gradient-to-b from-[#08182f] via-[#041021] to-[#020914] p-4 sm:p-6 lg:p-7">
          {/* Watermark Lengkungan Suci & Geometri Islami */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045] mix-blend-screen"
          >
            <svg
              className="h-[550px] w-[750px] text-[#E2B957]"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              viewBox="0 0 800 600"
            >
              <path
                d="M120 600 V280 C120 120, 260 20, 400 20 C540 20, 680 120, 680 280 V600"
                strokeWidth="1.2"
              />
              <path
                d="M140 600 V280 C140 135, 275 40, 400 40 C525 40, 660 135, 660 280 V600"
                strokeDasharray="4,4"
                strokeWidth="0.5"
              />
              <path
                d="M165 600 V280 C165 155, 290 65, 400 65 C510 65, 635 155, 635 280 V600"
                strokeWidth="0.8"
              />
              <circle cx="400" cy="280" r="190" strokeWidth="0.7" />
              <circle cx="400" cy="280" r="140" strokeDasharray="6,3" strokeWidth="0.6" />
              <circle cx="400" cy="280" r="90" strokeWidth="0.8" />
              <rect x="310" y="190" width="180" height="180" transform="rotate(0 400 280)" />
              <rect x="310" y="190" width="180" height="180" transform="rotate(45 400 280)" />
              <line x1="400" y1="20" x2="400" y2="580" strokeWidth="0.5" />
              <line x1="120" y1="280" x2="680" y2="280" strokeWidth="0.5" />
            </svg>
          </div>

          {/* Ornamen Sudut Emas */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-3 size-9 opacity-50 sm:size-10"
          >
            <svg
              className="size-full text-[#E2B957]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              viewBox="0 0 40 40"
            >
              <path d="M2 38 V10 C2 5.58 5.58 2 10 2 H38" />
              <path d="M7 38 V14 C7 10.13 10.13 7 14 7 H38" strokeDasharray="2,2" />
              <circle cx="10" cy="10" r="2" fill="currentColor" />
            </svg>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-3 size-9 opacity-50 sm:size-10"
          >
            <svg
              className="size-full text-[#E2B957]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              viewBox="0 0 40 40"
            >
              <path d="M38 38 V10 C38 5.58 34.42 2 30 2 H2" />
              <path d="M33 38 V14 C33 10.13 29.87 7 26 7 H2" strokeDasharray="2,2" />
              <circle cx="30" cy="10" r="2" fill="currentColor" />
            </svg>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none bottom-3 left-3 size-9 opacity-50 sm:size-10"
          >
            <svg
              className="size-full text-[#E2B957]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              viewBox="0 0 40 40"
            >
              <path d="M2 2 V30 C2 34.42 5.58 38 10 38 H38" />
              <path d="M7 2 V26 C7 29.87 10.13 33 14 33 H38" strokeDasharray="2,2" />
              <circle cx="10" cy="30" r="2" fill="currentColor" />
            </svg>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-3 bottom-3 size-9 opacity-50 sm:size-10"
          >
            <svg
              className="size-full text-[#E2B957]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              viewBox="0 0 40 40"
            >
              <path d="M38 2 V30 C38 34.42 34.42 38 30 38 H2" />
              <path d="M33 2 V26 C33 29.87 29.87 33 26 33 H2" strokeDasharray="2,2" />
              <circle cx="30" cy="30" r="2" fill="currentColor" />
            </svg>
          </div>

          {/* Isi Kartu */}
          <div className="relative z-10 flex flex-col justify-between">
            {/* Bagian Atas: Twin Column */}
            <div className="grid grid-cols-1 items-stretch gap-4 border-b border-[#E2B957]/20 pb-4 lg:grid-cols-12 lg:gap-6">
              {/* Kolom Kiri: Judul Pemenang Zona + Nama Besar + Kecamatan */}
              <div className="flex flex-col justify-center lg:col-span-7">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#E2B957]/40 bg-gradient-to-br from-[#E2B957]/25 via-[#E2B957]/10 to-transparent shadow-md shadow-[#E2B957]/10 sm:size-10">
                    {/* Bintang Oktagram Emas */}
                    <svg
                      className="size-5 text-[#F8DF94] sm:size-5.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 2L14.8 6.6L20 4.5L18.9 9.9L24 12L18.9 14.1L20 19.5L14.8 17.4L12 22L9.2 17.4L4 19.5L5.1 14.1L0 12L5.1 9.9L4 4.5L9.2 6.6L12 2Z"
                        fill="rgba(226, 185, 87, 0.25)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-white drop-shadow-sm sm:text-xl lg:text-2xl">
                      {labelZona}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif text-[11px] text-[#E2B957]">✦</span>
                      <span className="font-mono text-[11px] font-semibold tracking-[0.2em] uppercase text-[#E2B957]">
                        Wajib Pajak Teladan
                      </span>
                      <span className="font-serif text-[11px] text-[#E2B957]">✦</span>
                    </div>
                  </div>
                </div>

                <div className="mt-1 text-left">
                  <span className="mb-0.5 block font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400">
                    Wajib Pajak Terpilih
                  </span>
                  <h1 className="mb-1.5 text-2xl font-extrabold tracking-tight text-white drop-shadow sm:text-3xl lg:text-[34px]">
                    {pemenang.nama}
                  </h1>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-base font-normal text-[#F8DF94]/80 sm:text-lg">
                      Kecamatan
                    </span>
                    <span className="text-lg font-bold tracking-tight text-[#F6E7C1] underline decoration-[#E2B957]/60 decoration-2 underline-offset-4 sm:text-xl">
                      {pemenang.kecamatan}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Kotak Kredensial Resmi (Ringkas & Bersih) */}
              <div className="flex flex-col justify-center rounded-xl border border-[#E2B957]/30 bg-gradient-to-br from-[#0a1e3b]/90 via-[#071830]/90 to-[#030e1d]/90 p-3.5 shadow-xl backdrop-blur-md sm:p-4 lg:col-span-5">
                <div className="space-y-2.5">
                  <div>
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#F8DF94]/70">
                        NOP
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">
                        Pajak Bumi &amp; Bangunan
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-white/5 bg-slate-950/40 px-3 py-1.5 font-mono text-sm font-bold tracking-tight text-white sm:text-base">
                      <span>{pemenang.nopMasked}</span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#F8DF94]/70">
                        NIK
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">
                        Identitas Kependudukan
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-white/5 bg-slate-950/40 px-3 py-1.5 font-mono text-sm font-bold tracking-tight text-white sm:text-base">
                      <span>{pemenang.nikMasked || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian Tengah: Metadata Geografis & Properti */}
            <div className="grid grid-cols-1 gap-3 border-b border-[#E2B957]/20 py-3.5 text-left sm:grid-cols-3 sm:gap-4">
              <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5 sm:p-3">
                <span className="mb-0.5 block font-mono text-[10px] tracking-wider uppercase text-[#F8DF94]/70">
                  Kelurahan / Desa
                </span>
                <span className="block text-sm font-bold text-white sm:text-base">
                  {pemenang.kelurahan || '-'}
                </span>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5 sm:p-3">
                <span className="mb-0.5 block font-mono text-[10px] tracking-wider uppercase text-[#F8DF94]/70">
                  Alamat Wajib Pajak
                </span>
                <span className="block text-sm font-medium text-slate-200 sm:text-base">
                  {pemenang.alamatWp || '-'}
                </span>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5 sm:p-3">
                <span className="mb-0.5 block font-mono text-[10px] tracking-wider uppercase text-[#F8DF94]/70">
                  Objek Pajak
                </span>
                <span className="block text-sm font-medium text-slate-200 sm:text-base">
                  {pemenang.alamatOp || '-'}
                </span>
              </div>
            </div>

            {/* Bagian Bawah: Lintasan Kepatuhan 5 Tahun (2022 - 2026) */}
            <div className="pt-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#E2B957] shadow-md shadow-[#E2B957]/50" />
                <span className="font-mono text-xs font-bold tracking-[0.18em] uppercase text-white sm:text-sm">
                  Kepatuhan Pajak 5 Tahun Berturut-turut (2022 — 2026)
                </span>
              </div>

              {/* Lintasan Garis Waktu: Tahun di Atas, Bulatan di Tengah, Tanggal di Bawah */}
              <div className="relative py-1">
                <div
                  aria-hidden="true"
                  className="absolute top-[41px] right-8 left-8 -z-0 hidden h-[2px] bg-gradient-to-r from-[#E2B957]/20 via-[#E2B957] to-[#E2B957]/20 sm:block sm:top-[43px]"
                />
                <div className="relative z-10 grid grid-cols-5 gap-1.5 sm:gap-3">
                  {TAHUN_LIST.map((tahun, idx) => (
                    <div key={tahun} className="group flex flex-col items-center text-center">
                      {/* Tahun di Atas Bulatan */}
                      <span className="mb-1.5 font-mono text-xs font-bold text-white sm:text-sm">
                        {tahun}
                      </span>

                      {/* Bulatan Centang */}
                      <div className="flex size-9 items-center justify-center rounded-full border-2 border-[#E2B957] bg-gradient-to-b from-[#071830] to-[#030B17] text-[#E2B957] shadow-md shadow-[#E2B957]/20 ring-4 ring-[#030B17] transition duration-300 group-hover:scale-110 sm:size-10">
                        <svg
                          className="size-4 text-[#F8DF94] sm:size-4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      {/* Tanggal di Bawah Bulatan */}
                      <span className="mt-1.5 font-mono text-[10px] font-medium text-[#F8DF94]/85 sm:text-xs">
                        {formatRingkasTanggalLunas(pemenang.lunas[idx])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Catatan Kaki Otentikasi */}
            <div className="mt-3 flex flex-wrap items-center justify-between border-t border-[#E2B957]/20 pt-2.5 font-mono text-[10px] text-slate-400 sm:text-[11px]">
              <span className="tracking-widest">
                KODE OTENTIKASI RESMI:{' '}
                <span className="font-semibold text-white">
                  {slotKode}-2026-SAPPHIRE
                </span>
              </span>
              <span className="font-bold tracking-widest text-[#E2B957]">
                BADAN PENDAPATAN DAERAH
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
