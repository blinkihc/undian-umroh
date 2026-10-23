'use client';

import {
  Award,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  Layers,
  MapPin,
  Maximize2,
  ShieldCheck,
  Trophy,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

import {
  type PemenangPublikRespons,
  type SlotPemenangPublik,
  type WilayahPemenangPublik,
} from '@/lib/domain/pemenang';

type PemenangPublikDipublikasi = Extract<PemenangPublikRespons, { status: 'DIPUBLIKASI' }>;
type PemenangPublikBelumAda = Extract<
  PemenangPublikRespons,
  { status: 'TIDAK_ADA_PERIODE' | 'BELUM_DIUMUMKAN' }
>;

export function TampilanPemenangPublik({ data }: { data: PemenangPublikRespons }): ReactElement {
  const [disalinHash, setDisalinHash] = useState<string | null>(null);

  const salinKeClipboard = (teks: string, label: string) => {
    void navigator.clipboard.writeText(teks);
    setDisalinHash(label);
    setTimeout(() => {
      setDisalinHash(null);
    }, 2000);
  };

  if (data.status === 'TIDAK_ADA_PERIODE' || data.status === 'BELUM_DIUMUMKAN') {
    return <StatusKosongPublik data={data} />;
  }

  const { periode, integritas, wilayah } = data;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#051c14] via-[#072d1f] to-[#04150f] text-slate-100 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      {/* Ornamen Geometris Transparan Khas Acara Resmi */}
      <div
        className="pointer-events-none absolute inset-0 pattern-islamic-white opacity-[0.08]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e2c481]/40 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Header Resmi Pengumuman */}
        <header className="text-center md:text-left border-b border-white/15 pb-8 sm:pb-10">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Hasil Resmi Diumumkan
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e2c481]/15 border border-[#e2c481]/40 px-3 py-1 text-xs font-semibold text-[#f6eccf] shadow-xs">
              <Award className="h-3.5 w-3.5 text-[#e2c481]" />
              Apresiasi Taat PBB-P2 5 Tahun
            </span>
          </div>

          <h1 className="mt-4 font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
            {periode.judul}
          </h1>

          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            Daftar pemenang sah hadiah umroh gratis ke Tanah Suci Makkah dan kandidat cadangan bagi
            wajib pajak teladan Kabupaten Ogan Komering Ulu Selatan.
          </p>

          {/* Baris Metadata Pengumuman */}
          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-900/40 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-xs">
            {periode.tanggalAcara && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#e2c481]" />
                <span>Pelaksanaan: {periode.tanggalAcara}</span>
              </div>
            )}
            {periode.lokasiAcara && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#e2c481]" />
                <span>Lokasi: {periode.lokasiAcara}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>Diumumkan: {periode.publishedAt}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <span>Disahkan Saksi & Notaris</span>
            </div>
          </div>
        </header>

        {/* Daftar Pemenang per Wilayah / Zona: 2 Kolom Berdampingan di Desktop */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {wilayah.map((w: WilayahPemenangPublik) => (
            <BagianWilayahPublik key={w.kode} wilayah={w} />
          ))}
        </div>

        {/* Bukti Integritas Kriptografis & Audit Ledger */}
        <AuditIntegritasPublik
          integritas={integritas}
          disalinHash={disalinHash}
          onSalin={salinKeClipboard}
        />
      </div>
    </div>
  );
}

/**
 * Tampilan status ketika belum ada undian atau periode belum dipublikasikan
 */
function StatusKosongPublik({ data }: { data: PemenangPublikBelumAda }): ReactElement {
  const isBelumDiumumkan = data.status === 'BELUM_DIUMUMKAN';

  return (
    <div className="relative min-h-[75vh] flex items-center justify-center bg-gradient-to-b from-[#051c14] via-[#072d1f] to-[#04150f] text-slate-100 py-16 px-4 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 pattern-islamic-white opacity-[0.08]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl text-center rounded-2xl border border-white/15 bg-slate-900/70 p-8 sm:p-12 shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 shadow-md">
          <Clock className="h-8 w-8 animate-pulse" />
        </div>

        <h1 className="mt-6 font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {isBelumDiumumkan ? 'Pengumuman Pemenang' : 'Belum Ada Undian Aktif'}
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm sm:text-base text-slate-300 leading-relaxed">
          {data.pesan}
        </p>

        {isBelumDiumumkan && data.periode && (
          <div className="mt-4 inline-block rounded-lg bg-emerald-950/70 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-mono font-medium text-emerald-200">
            {data.periode.judul}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/cek"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-500 hover:to-emerald-600 transition"
          >
            <span>Cek Status NOP Anda</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-white/15 hover:text-white transition"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Komponen pembungkus satu wilayah (Zona 1 atau Zona 2)
 */
function BagianWilayahPublik({ wilayah }: { wilayah: WilayahPemenangPublik }): ReactElement {
  const slotUtama = wilayah.slot.find((s) => s.penerimaAktif) ?? wilayah.slot[0];
  const slotCadangan = wilayah.slot.filter((s) => s !== slotUtama);

  return (
    <section aria-labelledby={`judul-wilayah-${wilayah.kode}`} className="relative">
      {/* Header Wilayah */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#e2c481]/15 border border-[#e2c481]/30 px-2 py-0.5 text-xs font-mono font-bold text-[#fcf8ee]">
              {wilayah.kode}
            </span>
            <span className="text-xs font-medium text-emerald-300">
              Alokasi 1 Tiket Umroh
            </span>
          </div>
          <h2
            id={`judul-wilayah-${wilayah.kode}`}
            className="mt-1 font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
          >
            {wilayah.nama}
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium border ${
              wilayah.status === 'TERVERIFIKASI'
                ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-400/30 text-amber-200'
            }`}
          >
            {wilayah.status === 'TERVERIFIKASI' ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Pemenang Sah Terverifikasi
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Tahap Verifikasi
              </>
            )}
          </span>
        </div>
      </div>

      {/* Konten Slot Pemenang */}
      <div className="mt-6 space-y-6">
        {/* Pemenang Utama Terpilih */}
        {slotUtama && <KartuPemenangUtamaPublik slot={slotUtama} />}

        {/* Daftar Cadangan Pengganti (Bila ada) */}
        {slotCadangan.length > 0 && (
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <h3 className="text-xs font-bold font-heading text-slate-200 uppercase tracking-wider">
                  Kandidat Cadangan Siaga
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                Pengganti resmi bila pemenang berhalangan
              </span>
            </div>

            <div className="space-y-2.5">
              {slotCadangan.map((slot) => (
                <KartuCadanganPublik key={slot.kode} slot={slot} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Kartu Utama Pemenang Hadiah Umroh (Prestisius bergaya piagam resmi/boarding pass)
 */
function KartuPemenangUtamaPublik({ slot }: { slot: SlotPemenangPublik }): ReactElement {
  const [indexLightbox, setIndexLightbox] = useState<number | null>(null);
  const fotos = slot.fotoDokumentasi ?? [];

  return (
    <div className="relative rounded-2xl border border-[#e2c481]/35 bg-gradient-to-b from-[#072d22] via-[#05221a] to-[#031711] p-5 sm:p-6 lg:p-7 shadow-2xl overflow-hidden">
      {/* Aksen Kilau Emas Piagam Halus */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#e2c481]/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#e2c481]/50 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex flex-col justify-between">
        {/* Profil Pemenang Utama: Nama & NOP sejajar Kecamatan & Desa */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start justify-between border-b border-white/10 pb-3.5">
            {/* Sisi Kiri: Nama & NOP */}
            <div className="space-y-1">
              <h3 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight break-words drop-shadow-sm">
                {slot.peserta.nama}
              </h3>
              <div className="font-mono text-xs text-slate-300">
                NOP: <span className="font-bold text-emerald-300">{slot.peserta.nopMasked}</span>
              </div>
              {slot.peserta.nikMasked && slot.peserta.nikMasked !== '-' && (
                <div className="font-mono text-[11px] text-slate-400">
                  NIK: <span className="text-slate-300">{slot.peserta.nikMasked}</span>
                </div>
              )}
            </div>

            {/* Sisi Kanan: Kecamatan & Desa */}
            <div className="sm:text-right space-y-1">
              <div className="flex items-center sm:justify-end gap-1.5 text-sm sm:text-base font-bold text-white">
                <MapPin className="h-4 w-4 text-[#e2c481] shrink-0" />
                <span>Kec. {slot.peserta.kecamatan}</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-300">
                Desa {slot.peserta.kelurahan}
              </div>
              {slot.peserta.alamatWp && slot.peserta.alamatWp !== '-' && (
                <p className="text-[11px] text-slate-400 line-clamp-1" title={slot.peserta.alamatWp}>
                  Alamat WP: {slot.peserta.alamatWp}
                </p>
              )}
            </div>
          </div>

          {/* Kepatuhan PBB-P2 5 Tahun Terverifikasi */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-400" />
              <span>Kepatuhan PBB-P2 5 Tahun: Lunas</span>
            </span>
            <div className="flex items-center gap-1">
              {['2022', '2023', '2024', '2025', '2026'].map((tahun) => (
                <span
                  key={tahun}
                  className="inline-flex items-center gap-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-200"
                  title={`Tahun ${tahun} lunas terverifikasi`}
                >
                  <Check className="h-2 w-2 text-emerald-400" />
                  {tahun}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bukti Dokumentasi Penyerahan Simbolis */}
        {fotos.length > 0 && (
          <GaleriFotoSimbolis
            fotos={fotos}
            slot={slot}
            onBukaFoto={(idx) => {
              setIndexLightbox(idx);
            }}
          />
        )}
      </div>

      {/* Lightbox Pratinjau Foto Penuh */}
      {indexLightbox !== null && fotos[indexLightbox] && (
        <LightboxFotoModal
          fotos={fotos}
          index={indexLightbox}
          slot={slot}
          onTutup={() => {
            setIndexLightbox(null);
          }}
          onPindah={(idx) => {
            setIndexLightbox(idx);
          }}
        />
      )}
    </div>
  );
}

/**
 * Kartu Cadangan Pengganti (W1-C1, W1-C2, W2-C1, W2-C2)
 */
function KartuCadanganPublik({ slot }: { slot: SlotPemenangPublik }): ReactElement {
  const isGugur = slot.status === 'GUGUR';
  const isPemenangNaik = slot.penerimaAktif;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isPemenangNaik
          ? 'bg-emerald-950/50 border-emerald-400/50 text-white'
          : isGugur
            ? 'bg-slate-900/30 border-rose-500/30 opacity-75'
            : 'bg-slate-900/50 border-white/10 text-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-slate-200">
            {slot.kode}
          </span>
          <span className="text-xs text-slate-400 font-medium">Cadangan Pengganti</span>
        </div>

        <LencanaStatusSlot status={slot.status} penerimaAktif={slot.penerimaAktif} />
      </div>

      <div className="mt-3">
        <h4 className="font-heading font-bold text-base text-white break-words">
          {slot.peserta.nama}
        </h4>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs font-mono text-slate-400">
          <span>NOP: {slot.peserta.nopMasked}</span>
          <span>NIK: {slot.peserta.nikMasked}</span>
        </div>
        <p className="mt-1 text-xs text-slate-300">
          Kel. {slot.peserta.kelurahan}, Kec. {slot.peserta.kecamatan}
        </p>
      </div>

      {isPemenangNaik && (
        <div className="mt-3 rounded-md bg-emerald-500/20 border border-emerald-400/30 p-2 text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>Dipromosikan Menjadi Penerima Hadiah Umroh</span>
        </div>
      )}
    </div>
  );
}

/**
 * Galeri Foto Penyerahan Simbolis di dalam Kartu Pemenang
 */
function GaleriFotoSimbolis({
  fotos,
  slot,
  onBukaFoto,
}: {
  fotos: string[];
  slot: SlotPemenangPublik;
  onBukaFoto: (index: number) => void;
}): ReactElement {
  return (
    <div className="mt-5 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between gap-2 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Camera className="h-3.5 w-3.5 text-[#e2c481]" />
          <span>Bukti Penyerahan Simbolis</span>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Hadiah Telah Diserahkan
        </span>
      </div>

      {/* Tumpukan Foto (Photo Stack) */}
      <div className="relative mx-auto mt-2 max-w-[280px] sm:max-w-[320px] pt-1 pb-3">
        {fotos.length === 1 ? (
          <button
            key={`${fotos[0] ?? ''}-0`}
            type="button"
            onClick={() => {
              onBukaFoto(0);
            }}
            className="group relative aspect-4/3 w-full overflow-hidden rounded-xl border border-white/15 bg-black/50 shadow-md transition duration-200 hover:border-[#e2c481] hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-[#e2c481]"
            title="Perbesar foto bukti penyerahan simbolis ke-1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/aset/${fotos[0] ?? ''}`}
              alt={`Dokumentasi penyerahan simbolis ${slot.peserta.nama} foto 1`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
              <div className="rounded-full bg-black/60 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md">
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>
          </button>
        ) : (
          <div className="group relative aspect-4/3 w-full cursor-pointer">
            {/* Lapisan Foto Utama (depan, indeks 0) */}
            <button
              key={`${fotos[0] ?? ''}-0`}
              type="button"
              onClick={() => {
                onBukaFoto(0);
              }}
              className="relative z-20 aspect-4/3 w-full overflow-hidden rounded-xl border border-white/20 bg-black/60 shadow-xl transition-all duration-300 group-hover:border-[#e2c481] group-hover:shadow-2xl focus:outline-hidden focus:ring-2 focus:ring-[#e2c481]"
              title="Perbesar foto bukti penyerahan simbolis ke-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/aset/${fotos[0] ?? ''}`}
                alt={`Dokumentasi penyerahan simbolis ${slot.peserta.nama} foto 1`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                <div className="rounded-full bg-black/60 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md">
                  <Maximize2 className="h-4 w-4" />
                </div>
              </div>

              {/* Lencana Jumlah Foto Stack */}
              <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-xs border border-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-md">
                <Layers className="h-3 w-3 text-[#e2c481]" />
                <span>{fotos.length} Foto</span>
              </div>
            </button>

            {/* Lapisan Foto ke-2 di belakang (indeks 1) */}
            {fotos.length > 1 && fotos[1] && (
              <button
                key={`${fotos[1]}-1`}
                type="button"
                onClick={() => {
                  onBukaFoto(1);
                }}
                className="absolute inset-0 z-10 aspect-4/3 w-full overflow-hidden rounded-xl border border-white/15 bg-slate-800 shadow-lg transition-all duration-300 rotate-2 translate-y-1 translate-x-1 group-hover:rotate-4 group-hover:translate-x-2 group-hover:translate-y-2 focus:outline-hidden focus:ring-2 focus:ring-[#e2c481]"
                title="Perbesar foto bukti penyerahan simbolis ke-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/aset/${fotos[1]}`}
                  alt={`Dokumentasi penyerahan simbolis ${slot.peserta.nama} foto 2`}
                  className="h-full w-full object-cover opacity-75"
                  loading="lazy"
                />
              </button>
            )}

            {/* Lapisan Foto ke-3 di belakang (indeks 2 jika ada) */}
            {fotos.length > 2 && fotos[2] && (
              <button
                key={`${fotos[2]}-2`}
                type="button"
                onClick={() => {
                  onBukaFoto(2);
                }}
                className="absolute inset-0 z-0 aspect-4/3 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-md transition-all duration-300 -rotate-3 -translate-y-1 -translate-x-1 group-hover:-rotate-6 group-hover:-translate-x-2 group-hover:-translate-y-2 focus:outline-hidden focus:ring-2 focus:ring-[#e2c481]"
                title="Perbesar foto bukti penyerahan simbolis ke-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/aset/${fotos[2]}`}
                  alt={`Dokumentasi penyerahan simbolis ${slot.peserta.nama} foto 3`}
                  className="h-full w-full object-cover opacity-60"
                  loading="lazy"
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Catatan dan Waktu Penyerahan */}
      {(slot.diserahkanCatatan || slot.diserahkanAt) && (
        <div className="mt-2.5 space-y-1 text-xs text-slate-300 text-center">
          {slot.diserahkanCatatan && (
            <p className="text-emerald-100 italic leading-relaxed text-xs">
              &ldquo;{slot.diserahkanCatatan}&rdquo;
            </p>
          )}
          {slot.diserahkanAt && (
            <p className="text-slate-400 font-mono text-[11px]">
              Waktu penyerahan: {slot.diserahkanAt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Modal Lightbox Resolusi Penuh dengan Dukungan Keyboard
 */
function LightboxFotoModal({
  fotos,
  index,
  slot,
  onTutup,
  onPindah,
}: {
  fotos: string[];
  index: number;
  slot: SlotPemenangPublik;
  onTutup: () => void;
  onPindah: (baru: number) => void;
}): ReactElement {
  useEffect(() => {
    const tanganiKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onTutup();
      } else if (e.key === 'ArrowLeft') {
        onPindah(index > 0 ? index - 1 : fotos.length - 1);
      } else if (e.key === 'ArrowRight') {
        onPindah(index < fotos.length - 1 ? index + 1 : 0);
      }
    };

    window.addEventListener('keydown', tanganiKeyDown);
    return () => {
      window.removeEventListener('keydown', tanganiKeyDown);
    };
  }, [index, fotos.length, onTutup, onPindah]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      onClick={onTutup}
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Foto Penyerahan Hadiah Simbolis"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col items-center overflow-hidden rounded-2xl border border-white/20 bg-slate-950 p-4 shadow-2xl"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header Modal */}
        <div className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-white">
          <div>
            <h4 className="font-heading text-sm sm:text-base font-bold text-white">
              Penyerahan Simbolis — {slot.peserta.nama} ({slot.kode})
            </h4>
            <p className="text-xs font-mono text-slate-400">
              Foto {(index + 1).toString()} dari {fotos.length.toString()}
            </p>
          </div>

          <button
            type="button"
            onClick={onTutup}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition"
            title="Tutup (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Gambar Utama */}
        <div className="relative my-4 flex items-center justify-center max-w-full">
          {fotos.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onPindah(index > 0 ? index - 1 : fotos.length - 1);
              }}
              className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white shadow-lg hover:bg-black transition focus:outline-hidden focus:ring-2 focus:ring-[#e2c481]"
              title="Foto sebelumnya (Panah Kiri)"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/aset/${fotos[index] ?? ''}`}
            alt={`Bukti penyerahan simbolis ${slot.peserta.nama} foto ${(index + 1).toString()}`}
            className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-md"
          />

          {fotos.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onPindah(index < fotos.length - 1 ? index + 1 : 0);
              }}
              className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white shadow-lg hover:bg-black transition focus:outline-hidden focus:ring-2 focus:ring-[#e2c481]"
              title="Foto selanjutnya (Panah Kanan)"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Footer Keterangan Foto */}
        {(slot.diserahkanCatatan || slot.diserahkanAt) && (
          <div className="w-full border-t border-white/10 pt-3 text-center text-xs text-slate-300 space-y-1">
            {slot.diserahkanCatatan && (
              <p className="font-medium text-emerald-300 italic">
                &ldquo;{slot.diserahkanCatatan}&rdquo;
              </p>
            )}
            {slot.diserahkanAt && (
              <p className="text-[11px] font-mono text-slate-400">
                Waktu Penyerahan: {slot.diserahkanAt}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Bagian Bukti Integritas Kriptografis & Audit Ledger
 */
function AuditIntegritasPublik({
  integritas,
  disalinHash,
  onSalin,
}: {
  integritas: PemenangPublikDipublikasi['integritas'];
  disalinHash: string | null;
  onSalin: (teks: string, label: string) => void;
}): ReactElement {
  const [terbuka, setTerbuka] = useState(false);

  return (
    <section
      className="mt-12 sm:mt-16 rounded-2xl border border-white/15 bg-slate-900/60 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300"
      aria-labelledby="judul-integritas"
    >
      {/* Tombol Header Akordeon */}
      <button
        type="button"
        onClick={() => {
          setTerbuka(!terbuka);
        }}
        aria-expanded={terbuka}
        aria-controls="konten-integritas"
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 text-left hover:bg-white/5 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#e2c481]"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e2c481]/15 border border-[#e2c481]/30 text-[#fcf8ee] shadow-md shrink-0">
            <ShieldCheck className="h-5 w-5 text-[#e2c481]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="judul-integritas" className="font-heading text-base sm:text-lg font-bold text-white">
                Bukti Integritas Kriptografis & Rekapitulasi Peserta
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Transparansi audit matematis: data peserta tersegel SHA-256 dan rekapitulasi data undian.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs font-mono font-semibold text-emerald-300">
            <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
            SHA-256 SEALED
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-transform duration-300 ${
              terbuka ? 'rotate-180 bg-[#e2c481]/20 text-[#fcf8ee]' : ''
            }`}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </button>

      {/* Konten Akordeon dengan Animasi Ketinggian Lembut */}
      <div
        id="konten-integritas"
        className={`grid transition-all duration-300 ease-in-out ${
          terbuka ? 'grid-rows-[1fr] opacity-100 border-t border-white/10' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-5 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Hash Snapshot Peserta */}
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Hash Snapshot Peserta Terkunci
                  </span>

                  {integritas.snapshotHash && (
                    <button
                      type="button"
                      onClick={() => {
                        if (integritas.snapshotHash) {
                          onSalin(integritas.snapshotHash, 'snapshot');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/15 px-2.5 py-1 text-xs font-mono text-emerald-300 hover:text-white transition"
                    >
                      {disalinHash === 'snapshot' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="mt-3 font-mono text-xs break-all text-emerald-200/90 bg-black/40 border border-white/5 rounded-lg p-2.5">
                  {integritas.snapshotHash ?? '(Tidak tersedia)'}
                </p>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  Sidik jari digital seluruh peserta yang sah berhak mengikuti undian sebelum pengundian
                  dimulai.
                </p>
              </div>

              {/* Hash Berkas Hasil Undian */}
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Hash Berkas Hasil Undian
                  </span>

                  {integritas.hasilHash && (
                    <button
                      type="button"
                      onClick={() => {
                        if (integritas.hasilHash) {
                          onSalin(integritas.hasilHash, 'hasil');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/15 px-2.5 py-1 text-xs font-mono text-emerald-300 hover:text-white transition"
                    >
                      {disalinHash === 'hasil' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="mt-3 font-mono text-xs break-all text-emerald-200/90 bg-black/40 border border-white/5 rounded-lg p-2.5">
                  {integritas.hasilHash ?? '(Tidak tersedia)'}
                </p>
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  Sidik jari digital berkas hasil penarikan undian yang diunggah dan diverifikasi saksi.
                </p>
              </div>
            </div>

            {/* Tabel Rekapitulasi Peserta Sah & Pembanding Tidak Lolos */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
              <div className="bg-white/5 border-b border-white/10 px-5 py-3 text-xs font-heading font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Rekapitulasi Peserta & Pembanding Kriteria</span>
                <span className="text-[11px] font-normal font-sans text-slate-400 lowercase">
                  pbb-p2 lunas 5 tahun berturut-turut
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-white/10 text-slate-400 font-mono text-xs">
                    <tr>
                      <th className="px-5 py-3 font-medium">Wilayah</th>
                      <th className="px-5 py-3 font-medium">Keterangan Wilayah</th>
                      <th className="px-5 py-3 text-right font-medium text-emerald-400">Peserta Sah (Lolos)</th>
                      <th className="px-5 py-3 text-right font-medium text-slate-400">Tidak Lolos Syarat</th>
                      <th className="px-5 py-3 text-right font-medium text-slate-300">Total Wajib Pajak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {integritas.pesertaPerWilayah.map((rw) => {
                      const lolos = rw.jumlahPeserta;
                      const tidakLolos = rw.jumlahTidakLolos ?? 0;
                      const total = rw.totalWp ?? lolos + tidakLolos;

                      return (
                        <tr key={rw.kode} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3 font-mono font-bold text-white">{rw.kode}</td>
                          <td className="px-5 py-3 text-slate-300">{rw.nama}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-emerald-300 angka-tabular">
                            {lolos.toLocaleString('id-ID')} WP
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-slate-400 angka-tabular">
                            {tidakLolos > 0 ? `${tidakLolos.toLocaleString('id-ID')} WP` : '-'}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-medium text-slate-200 angka-tabular">
                            {total.toLocaleString('id-ID')} WP
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-white/5 font-bold text-white border-t border-white/10">
                      <td colSpan={2} className="px-5 py-3.5">
                        Total Seluruh Wilayah
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-300 text-sm angka-tabular">
                        {integritas.totalPeserta.toLocaleString('id-ID')} WP
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-400 text-sm angka-tabular">
                        {integritas.totalTidakLolos !== undefined && integritas.totalTidakLolos > 0
                          ? `${integritas.totalTidakLolos.toLocaleString('id-ID')} WP`
                          : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-[#fcf8ee] text-sm angka-tabular">
                        {(integritas.totalSemua ?? integritas.totalPeserta + (integritas.totalTidakLolos ?? 0)).toLocaleString('id-ID')} WP
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Komponen Lencana Status Slot
 */
function LencanaStatusSlot({
  status,
  penerimaAktif,
}: {
  status: string;
  penerimaAktif: boolean;
}): ReactElement {
  if (status === 'TERVERIFIKASI') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 shadow-xs">
        <UserCheck className="h-3 w-3" />
        Terverifikasi
      </span>
    );
  }

  if (status === 'GUGUR') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/40 px-2.5 py-0.5 text-xs font-semibold text-rose-300 shadow-xs">
        <XCircle className="h-3 w-3" />
        Gugur
      </span>
    );
  }

  if (penerimaAktif) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#e2c481]/20 border border-[#e2c481]/40 px-2.5 py-0.5 text-xs font-semibold text-[#fcf8ee] shadow-xs">
        <Award className="h-3 w-3 text-[#e2c481]" />
        Pemenang
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 border border-slate-600/50 px-2.5 py-0.5 text-xs font-semibold text-slate-300 shadow-xs">
      <Clock className="h-3 w-3" />
      Kandidat
    </span>
  );
}
