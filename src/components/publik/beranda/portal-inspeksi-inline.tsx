'use client';

import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { pecahkanCaptcha, type SolusiCaptcha, type TantanganCaptcha } from '@/lib/captcha';
import { formatNop } from '@/lib/domain/nop';
import { type HasilCekNopPublik } from '@/server/services/peserta';

type StatusCaptcha = 'idle' | 'memuat' | 'memecahkan' | 'gagal';

export function PortalInspeksiInline(): ReactElement {
  const [inputNop, setInputNop] = useState('16.09.030.003.003-0003.0');
  const [memuat, setMemuat] = useState(false);
  const [hasil, setHasil] = useState<HasilCekNopPublik | null>(null);
  const [galatValidasi, setGalatValidasi] = useState<string | null>(null);
  const [statusCaptcha, setStatusCaptcha] = useState<StatusCaptcha>('idle');
  const [pesanCaptcha, setPesanCaptcha] = useState<string>('');

  const digitSaja = inputNop.replace(/\D/g, '');
  const previewFormat = digitSaja.length === 18 ? formatNop(digitSaja) : null;

  const handleUbahInput = (val: string) => {
    setInputNop(val);
    setGalatValidasi(null);
  };

  const jalankanVerifikasiCaptchaDanKirim = async (digit: string): Promise<void> => {
    setStatusCaptcha('memuat');
    setPesanCaptcha('Mengambil tantangan verifikasi keamanan...');
    try {
      const respTantangan = await fetch('/api/publik/captcha');
      if (!respTantangan.ok) {
        throw new Error('Gagal mengambil verifikasi');
      }
      const tantangan: TantanganCaptcha = await respTantangan.json();

      setStatusCaptcha('memecahkan');
      setPesanCaptcha('Menyelesaikan verifikasi keamanan otomatis...');
      const solusi: SolusiCaptcha = await pecahkanCaptcha(tantangan);

      setPesanCaptcha('Memeriksa NOP dengan verifikasi keamanan...');
      const resKirim = await fetch('/api/publik/cek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nop: digit, captcha: solusi }),
      });

      if (!resKirim.ok) {
        const errJson = await resKirim.json().catch(() => null);
        if (resKirim.status === 429) {
          throw new Error(
            errJson?.error?.message ?? 'Terlalu banyak pengecekan. Silakan coba sesaat lagi.',
          );
        }
        throw new Error(errJson?.error?.message ?? 'Verifikasi captcha gagal.');
      }

      const data: HasilCekNopPublik = await resKirim.json();
      setHasil(data);
      setStatusCaptcha('idle');
      setPesanCaptcha('');
    } catch (err) {
      setStatusCaptcha('gagal');
      setPesanCaptcha(err instanceof Error ? err.message : 'Verifikasi keamanan gagal.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalatValidasi(null);
    setStatusCaptcha('idle');
    setPesanCaptcha('');

    const digit = inputNop.replace(/\D/g, '');
    if (digit.length !== 18) {
      setGalatValidasi('NOP harus 18 digit angka sesuai SPPT PBB-P2.');
      return;
    }

    setMemuat(true);
    setHasil(null);

    try {
      const res = await fetch('/api/publik/cek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nop: digit }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        if (res.status === 429) {
          if (errJson?.error?.details?.captchaDiperlukan === true) {
            await jalankanVerifikasiCaptchaDanKirim(digit);
            return;
          }
          throw new Error(
            errJson?.error?.message ?? 'Terlalu banyak pengecekan. Silakan coba sesaat lagi.',
          );
        }
        throw new Error(errJson?.error?.message ?? 'Gagal menghubungi server verifikasi.');
      }

      const data: HasilCekNopPublik = await res.json();
      setHasil(data);
    } catch (err) {
      setGalatValidasi(
        err instanceof Error ? err.message : 'Gagal memeriksa NOP. Silakan ulangi kembali.',
      );
    } finally {
      setMemuat(false);
    }
  };

  // Bersihkan penamaan wilayah agar murni "Zona 1" atau "Zona 2" tanpa kurung dan embel-embel
  const formatZonaMurni = (namaWilayah: string) => {
    if (/zona\s*1|w1|wilayah\s*1/i.test(namaWilayah)) return 'Zona 1';
    if (/zona\s*2|w2|wilayah\s*2/i.test(namaWilayah)) return 'Zona 2';
    return namaWilayah;
  };

  return (
    <section
      className="relative max-w-4xl mx-auto scroll-mt-24 my-6"
      id="terminal-cek"
      aria-labelledby="judul-terminal-cek"
    >
      <div className="rounded-3xl bg-[#082e1c]/90 backdrop-blur-md p-6 sm:p-8 shadow-2xl border-2 border-white/30 text-white relative overflow-hidden">
        {/* Header Terminal Mini dengan List Putih */}
        <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span
              id="judul-terminal-cek"
              className="font-mono text-xs text-white font-bold uppercase tracking-wider"
            >
              TERMINAL VERIFIKASI NOP // SISTEM PBB-P2 OKU SELATAN
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-200 font-bold bg-white/10 px-2.5 py-0.5 rounded border border-white/25">
            SINKRONISASI RESMI
          </span>
        </div>

        {/* Formulir Pencarian NOP */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="input-nop-terminal"
              className="block font-mono text-xs text-emerald-100 font-bold mb-2 uppercase tracking-wider flex items-center justify-between"
            >
              <span>Masukkan Nomor Objek Pajak (18 Digit)</span>
              <span className="text-emerald-200/70 font-normal">Format: 16.09.XXX...</span>
            </label>

            <div className="relative flex items-center">
              <input
                id="input-nop-terminal"
                type="text"
                inputMode="numeric"
                pattern="[0-9.\- ]*"
                value={inputNop}
                onChange={(e) => handleUbahInput(e.target.value)}
                placeholder="16.09.030.003.003-0003.0"
                className="w-full h-14 pl-4 pr-32 font-mono text-base sm:text-lg bg-black/35 border-2 border-white/30 rounded-xl text-white placeholder:text-white/40 focus:outline-hidden focus:border-white focus:ring-2 focus:ring-white/25 transition-all shadow-inner tracking-wider angka-tabular"
                autoComplete="off"
                aria-label="Nomor Objek Pajak 18 Digit"
              />

              <button
                type="button"
                onClick={() => {
                  setInputNop('16.09.030.003.003-0003.0');
                  setGalatValidasi(null);
                }}
                className="absolute right-3 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                Contoh NOP
              </button>
            </div>

            {previewFormat && (
              <p className="mt-2 text-xs text-emerald-200/80 pl-1 font-mono">
                Format resmi:{' '}
                <span className="text-emerald-300 font-bold">{previewFormat}</span>
              </p>
            )}
          </div>

          {/* Tombol Aksi: CEK DATA */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={memuat || statusCaptcha === 'memuat' || statusCaptcha === 'memecahkan'}
              style={{ color: '#ffffff' }}
              className="w-full h-12 rounded-xl bg-primary-700 hover:bg-primary-600 !text-white font-heading font-bold text-sm tracking-wider uppercase shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 border-2 border-white/40 ring-1 ring-white/20"
            >
              {memuat ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" style={{ color: '#ffffff' }} />
              ) : (
                <Search className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
              )}
              <span style={{ color: '#ffffff' }}>{memuat ? 'Memeriksa Data...' : 'CEK DATA'}</span>
            </button>
          </div>

          {/* Pesan Galat Validasi */}
          {galatValidasi && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{galatValidasi}</span>
            </div>
          )}

          {/* Status Captcha PoW jika diperlukan */}
          {statusCaptcha !== 'idle' && (
            <div
              className={`rounded-xl border p-3.5 text-xs flex items-center gap-2 ${
                statusCaptcha === 'gagal'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {statusCaptcha === 'gagal' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
              )}
              <span className="font-mono">{pesanCaptcha}</span>
            </div>
          )}
        </form>

        {/* Kapsul Hasil Dinamis */}
        {hasil && (
          <div className="mt-6 pt-6 border-t border-slate-100 transition-all duration-300">
            {hasil.status === 'IKUT' && (
              <div className="rounded-2xl p-5 sm:p-6 bg-emerald-50/70 border border-emerald-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 font-mono text-[11px] font-bold tracking-wider uppercase">
                        STATUS: MEMENUHI SYARAT
                      </span>
                      <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 mt-0.5">
                        Objek Pajak Sah Masuk Undian
                      </h3>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">
                      Alokasi Wilayah
                    </span>
                    <span className="font-heading font-bold text-primary-800 text-sm sm:text-base">
                      {formatZonaMurni(hasil.wilayah)}
                    </span>
                  </div>
                </div>

                {/* Kartu Informasi Wajib Pajak */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      NOP Masked
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-slate-900 font-bold tracking-wider mt-0.5 block angka-tabular">
                      {hasil.nopMasked}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      Wajib Pajak
                    </span>
                    <span className="font-heading text-xs sm:text-sm text-slate-900 font-bold truncate mt-0.5 block">
                      {hasil.nama}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">
                      Penempatan
                    </span>
                    <span className="font-heading text-xs sm:text-sm text-primary-700 font-bold mt-0.5 block">
                      {formatZonaMurni(hasil.wilayah)}
                    </span>
                  </div>
                </div>

                {/* Baris Rekam 5 Tahun Lunas */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-700 mb-2">
                    <span className="font-semibold">REKAM PELUNASAN 5 TAHUN BERUNTUN:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 5/5 LUNAS
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center font-mono text-xs">
                    <div className="bg-white border border-emerald-200 rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-sans">2022</span>
                      <span className="text-emerald-700 font-bold">✓ LUNAS</span>
                    </div>
                    <div className="bg-white border border-emerald-200 rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-sans">2023</span>
                      <span className="text-emerald-700 font-bold">✓ LUNAS</span>
                    </div>
                    <div className="bg-white border border-emerald-200 rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-sans">2024</span>
                      <span className="text-emerald-700 font-bold">✓ LUNAS</span>
                    </div>
                    <div className="bg-white border border-emerald-200 rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-sans">2025</span>
                      <span className="text-emerald-700 font-bold">✓ LUNAS</span>
                    </div>
                    <div className="bg-emerald-600 text-white rounded-lg p-2 shadow-2xs">
                      <span className="text-[10px] text-emerald-100 block font-sans">2026</span>
                      <span className="font-bold">✓ TEPAT WAKTU</span>
                    </div>
                  </div>
                </div>

                {/* ID Tiket Digital */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono border-t border-emerald-200/60">
                  <span className="text-slate-600">
                    ID Tiket Digital:{' '}
                    <strong className="text-primary-800 font-bold">
                      OKUS-{formatZonaMurni(hasil.wilayah).replace(' ', '')}-{digitSaja.slice(-5)}
                    </strong>
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Hak undi setara 1 kupon CSPRNG
                  </span>
                </div>
              </div>
            )}

            {hasil.status === 'TIDAK_IKUT' && (
              <div className="rounded-2xl p-5 sm:p-6 bg-rose-50 border border-rose-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="font-heading font-bold text-sm uppercase text-rose-800 tracking-wider">
                    STATUS : BELUM MEMENUHI SYARAT
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <p>
                    Wajib Pajak: <strong className="text-slate-900">{hasil.nama}</strong> ({hasil.nopMasked})
                  </p>
                  <p className="text-rose-700 font-medium">
                    Alasan: {hasil.alasan.join(', ')}
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Petunjuk: {hasil.petunjuk}
                  </p>
                </div>
              </div>
            )}

            {hasil.status === 'TIDAK_DITEMUKAN' && (
              <div className="rounded-2xl p-5 bg-slate-50 border border-slate-200 text-slate-700 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>NOP Tidak Ditemukan</span>
                </div>
                <p className="font-mono text-slate-500">NOP: {hasil.nopMasked}</p>
                <p className="text-slate-600 leading-relaxed">{hasil.pesan}</p>
              </div>
            )}

            {hasil.status === 'BELUM_ADA_DATA' && (
              <div className="rounded-2xl p-5 bg-amber-50 border border-amber-200 text-amber-900 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  <span>Data Belum Tersedia</span>
                </div>
                <p>{hasil.pesan}</p>
              </div>
            )}

            {hasil.status === 'NOP_INVALID' && (
              <div className="rounded-2xl p-5 bg-rose-50 border border-rose-200 text-rose-900 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Format NOP Tidak Sesuai</span>
                </div>
                <p>{hasil.pesan}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
