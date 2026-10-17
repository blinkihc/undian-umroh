'use client';

import {
  AlertCircle,
  Building,
  CheckCircle2,
  HelpCircle,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { pecahkanCaptcha, type SolusiCaptcha, type TantanganCaptcha } from '@/lib/captcha';
import { formatNop } from '@/lib/domain/nop';
import { type HasilCekNopPublik } from '@/server/services/peserta';

type StatusCaptcha = 'idle' | 'memuat' | 'memecahkan' | 'gagal';

export function FormCekNop(): ReactElement {
  const [inputNop, setInputNop] = useState('');
  const [memuat, setMemuat] = useState(false);
  const [hasil, setHasil] = useState<HasilCekNopPublik | null>(null);
  const [galatValidasi, setGalatValidasi] = useState<string | null>(null);
  const [statusCaptcha, setStatusCaptcha] = useState<StatusCaptcha>('idle');
  const [pesanCaptcha, setPesanCaptcha] = useState<string>('');

  // Otomatis bersihkan format input untuk pratinjau
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
          throw new Error(errJson?.error?.message ?? 'Terlalu banyak pengecekan. Coba lagi beberapa menit lagi.');
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
      setGalatValidasi('NOP harus 18 digit angka.');
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
            // Perlu captcha, jalankan alur verifikasi captcha proof-of-work
            await jalankanVerifikasiCaptchaDanKirim(digit);
            return;
          }
          throw new Error(errJson?.error?.message ?? 'Terlalu banyak pengecekan. Coba lagi beberapa menit lagi.');
        }
        throw new Error(errJson?.error?.message ?? 'Gagal menghubungi server.');
      }

      const data: HasilCekNopPublik = await res.json();
      setHasil(data);
    } catch (err) {
      setGalatValidasi(err instanceof Error ? err.message : 'Gagal memeriksa NOP. Silakan coba lagi.');
    } finally {
      setMemuat(false);
    }
  };

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 md:px-6 md:py-12">
      {/* Header Halaman */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800">
          <Sparkles className="h-3.5 w-3.5 text-primary-700" />
          Layanan Publik Bapenda OKU Selatan
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl">
          Cek Kepesertaan Undian Umroh
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-600">
          Masukkan 18 digit Nomor Objek Pajak (NOP) PBB-P2 Anda untuk memeriksa apakah objek pajak Anda terdaftar dalam pengundian hadiah umroh gratis.
        </p>
      </div>

      {/* Formulir Pencarian */}
      <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-neutral-300 bg-white p-6 shadow-xs md:p-8">
        <label htmlFor="input-nop" className="block text-sm font-semibold text-neutral-800">
          Nomor Objek Pajak (NOP)
        </label>
        <p className="mt-0.5 text-xs text-neutral-500">
          Bisa dimasukkan dengan atau tanpa titik/strip (contoh: 160903000300300030).
        </p>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              id="input-nop"
              type="text"
              inputMode="numeric"
              pattern="[0-9.\- ]*"
              value={inputNop}
              onChange={(e) => handleUbahInput(e.target.value)}
              placeholder="Contoh: 16.09.030.003.003-0003.0"
              className="w-full rounded-md border border-neutral-300 px-4 py-2.5 font-mono text-base text-neutral-900 shadow-inner placeholder:text-neutral-400 focus:border-primary-600 focus:outline-hidden focus:ring-2 focus:ring-primary-600/30"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={memuat || statusCaptcha === 'memuat' || statusCaptcha === 'memecahkan'}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-700 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-800 focus:outline-hidden focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {memuat ? 'Memeriksa...' : 'Periksa NOP'}
          </button>
        </div>

        {/* Pratinjau Format Bertitik */}
        {previewFormat && (
          <p className="mt-2 text-xs text-neutral-600">
            Format resmi: <span className="font-mono font-medium text-neutral-900">{previewFormat}</span>
          </p>
        )}

        {/* Status Captcha Proof-of-Work */}
        {statusCaptcha !== 'idle' && (
          <div
            className={`mt-4 rounded-lg border p-4 text-xs ${
              statusCaptcha === 'gagal'
                ? 'border-rose-300 bg-rose-50 text-rose-800'
                : 'border-amber-300 bg-amber-50 text-amber-900'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {statusCaptcha === 'gagal' ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-700" />
                )}
                <span className="font-medium">{pesanCaptcha}</span>
              </div>
              {statusCaptcha === 'gagal' && (
                <button
                  type="button"
                  onClick={() => jalankanVerifikasiCaptchaDanKirim(digitSaja)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba Lagi
                </button>
              )}
            </div>
          </div>
        )}

        {galatValidasi && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{galatValidasi}</span>
          </div>
        )}
      </form>

      {/* Bagian Hasil Pencarian dengan aria-live untuk pembaca layar */}
      <div aria-live="polite" className="mt-6">
        {hasil && <KartuHasilCek hasil={hasil} />}
      </div>

      {/* Petunjuk Tambahan */}
      <div className="mt-10 rounded-lg border border-neutral-200 bg-neutral-50 p-5 text-xs text-neutral-600">
        <h4 className="flex items-center gap-1.5 font-semibold text-neutral-800">
          <HelpCircle className="h-4 w-4 text-primary-700" />
          Kriteria Wajib Pajak yang Berhak Ikut Undian:
        </h4>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Wajib Pajak PBB-P2 di wilayah Kabupaten OKU Selatan.</li>
          <li>Telah melunasi kewajiban PBB-P2 secara berturut-turut untuk 5 tahun pajak (2022 s/d 2026).</li>
          <li>Pelunasan dilakukan tepat waktu sebelum batas akhir yang telah ditetapkan.</li>
        </ul>
      </div>
    </div>
  );
}

function KartuHasilCek({ hasil }: { hasil: HasilCekNopPublik }): ReactElement {
  if (hasil.status === 'NOP_INVALID') {
    return (
      <div className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-rose-800 shadow-xs">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 shrink-0 text-rose-600" />
          <div>
            <h3 className="text-base font-bold text-rose-900">Format NOP Tidak Sesuai</h3>
            <p className="mt-1 text-sm">{hasil.pesan}</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasil.status === 'BELUM_ADA_DATA') {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900 shadow-xs">
        <div className="flex items-start gap-3">
          <Info className="h-6 w-6 shrink-0 text-amber-600" />
          <div>
            <h3 className="text-base font-bold text-amber-900">Data Belum Tersedia</h3>
            <p className="mt-1 text-sm text-amber-800">{hasil.pesan}</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasil.status === 'TIDAK_DITEMUKAN') {
    return (
      <div className="rounded-xl border border-neutral-300 bg-white p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <XCircle className="h-6 w-6 shrink-0 text-neutral-400" />
          <div>
            <h3 className="text-base font-bold text-neutral-900">NOP Tidak Ditemukan</h3>
            <p className="mt-1 text-xs font-mono text-neutral-500">NOP: {hasil.nopMasked}</p>
            <p className="mt-2 text-sm text-neutral-600">{hasil.pesan}</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasil.status === 'IKUT') {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-6 shadow-xs">
        {hasil.sementara && (
          <div className="mb-4 inline-block rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            {hasil.labelSementara}
          </div>
        )}

        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                IKUT UNDIAN
              </span>
              <span className="text-xs font-semibold text-emerald-900">
                {hasil.wilayah}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-bold text-neutral-900">
              {hasil.nama}
            </h3>
            <p className="mt-0.5 text-xs font-mono text-neutral-600">
              NOP: {hasil.nopMasked}
            </p>

            <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4 text-xs text-neutral-700">
              <p className="font-semibold text-emerald-800">
                Selamat! Objek pajak Anda telah memenuhi semua syarat pelunasan PBB-P2 (2022 s/d 2026).
              </p>
              <p className="mt-1 text-neutral-600">
                NOP Anda terdaftar sebagai peserta resmi dalam pengundian hadiah umroh untuk <strong>{hasil.wilayah}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasil.status === 'TIDAK_IKUT') {
    return (
      <div className="rounded-xl border border-amber-300 bg-white p-6 shadow-xs">
        {hasil.sementara && (
          <div className="mb-4 inline-block rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            {hasil.labelSementara}
          </div>
        )}

        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900">
              TIDAK IKUT UNDIAN
            </span>

            <h3 className="mt-3 text-lg font-bold text-neutral-900">
              {hasil.nama}
            </h3>
            <p className="mt-0.5 text-xs font-mono text-neutral-600">
              NOP: {hasil.nopMasked}
            </p>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <h4 className="text-xs font-bold text-neutral-800">
                Alasan Tidak Memenuhi Kriteria:
              </h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-neutral-700">
                {hasil.alasan.map((alasan, i) => (
                  <li key={i}>{alasan}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              <Building className="h-4 w-4 shrink-0 text-neutral-500" />
              <span>{hasil.petunjuk}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <></>;
}
