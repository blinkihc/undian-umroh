'use client';

import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Info,
  ShieldCheck,
  Trophy,
  UserCheck,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactElement } from 'react';

import {
  type PemenangPublikRespons,
  type SlotPemenangPublik,
  type WilayahPemenangPublik,
} from '@/server/services/pemenang';

export function TampilanPemenangPublik({
  data,
}: {
  data: PemenangPublikRespons;
}): ReactElement {
  const [disalinHash, setDisalinHash] = useState<string | null>(null);

  const salinKeClipboard = (teks: string, label: string) => {
    void navigator.clipboard.writeText(teks);
    setDisalinHash(label);
    setTimeout(() => setDisalinHash(null), 2000);
  };

  if (data.status === 'TIDAK_ADA_PERIODE' || data.status === 'BELUM_DIUMUMKAN') {
    return (
      <div className="mx-auto max-w-[960px] px-4 py-12 md:px-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-xs md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-neutral-900 md:text-2xl">
            {data.status === 'BELUM_DIUMUMKAN' ? 'Pengumuman Pemenang' : 'Belum Ada Undian Aktif'}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-neutral-600">
            {data.pesan}
          </p>
          {data.status === 'BELUM_DIUMUMKAN' && data.periode && (
            <div className="mt-4 inline-block rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700">
              {data.periode.judul}
            </div>
          )}
          <div className="mt-8">
            <Link
              href="/cek"
              className="inline-flex items-center gap-2 rounded-md bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-800"
            >
              Cek Status NOP Anda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { periode, integritas, wilayah } = data;

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 md:px-6 md:py-12">
      {/* Header Pengumuman */}
      <div className="border-b border-neutral-200 pb-8 text-center md:text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Hasil Resmi Diumumkan
        </div>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900 md:text-3xl">
          {periode.judul}
        </h1>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-neutral-600 md:justify-start">
          {periode.tanggalAcara && <span>Pelaksanaan: {periode.tanggalAcara}</span>}
          {periode.lokasiAcara && <span>• Lokasi: {periode.lokasiAcara}</span>}
          <span>• Diumumkan: {periode.publishedAt}</span>
        </div>
      </div>

      {/* Bagian Daftar Pemenang per Wilayah */}
      <div className="mt-8 space-y-10">
        {wilayah.map((w: WilayahPemenangPublik) => (
          <section key={w.kode} aria-labelledby={`judul-wilayah-${w.kode}`}>
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h2 id={`judul-wilayah-${w.kode}`} className="text-xl font-bold text-neutral-900">
                  {w.nama}
                </h2>
                <p className="text-xs text-neutral-500">Pemenang Utama Terpilih</p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                  {w.status === 'TERVERIFIKASI' ? 'Pemenang Sah Terverifikasi' : 'Tahap Verifikasi'}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 max-w-xl">
              {w.slot.map((slot: SlotPemenangPublik) => (
                <KartuSlotPublik key={slot.kode} slot={slot} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Bukti Integritas Kriptografis */}
      <section className="mt-14 rounded-xl border border-neutral-200 bg-neutral-50 p-6 md:p-8" aria-labelledby="judul-integritas">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 id="judul-integritas" className="text-lg font-bold text-neutral-900">
              Bukti Integritas Kriptografis Data
            </h2>
            <p className="text-xs text-neutral-600">
              Transparansi penuh pengundian: data dijamin asli dan tidak berubah menggunakan fungsi hash SHA-256.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Hash Snapshot */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700">Hash Snapshot Peserta Terkunci</span>
              {integritas.snapshotHash && (
                <button
                  type="button"
                  onClick={() => salinKeClipboard(integritas.snapshotHash!, 'snapshot')}
                  className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800"
                >
                  {disalinHash === 'snapshot' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Tersalin</span>
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
            <p className="mt-2 font-mono text-xs break-all text-neutral-900">
              {integritas.snapshotHash ?? '(Tidak tersedia)'}
            </p>
            <p className="mt-2 text-[11px] text-neutral-500">
              Sidik jari digital seluruh peserta yang sah berhak mengikuti undian sebelum pengundian dimulai.
            </p>
          </div>

          {/* Hash Hasil Undian */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700">Hash Berkas Hasil Undian</span>
              {integritas.hasilHash && (
                <button
                  type="button"
                  onClick={() => salinKeClipboard(integritas.hasilHash!, 'hasil')}
                  className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800"
                >
                  {disalinHash === 'hasil' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Tersalin</span>
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
            <p className="mt-2 font-mono text-xs break-all text-neutral-900">
              {integritas.hasilHash ?? '(Tidak tersedia)'}
            </p>
            <p className="mt-2 text-[11px] text-neutral-500">
              Sidik jari digital berkas hasil penarikan undian yang diunggah dan diverifikasi saksi.
            </p>
          </div>
        </div>

        {/* Tabel Rekap Peserta */}
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <div className="border-b border-neutral-200 bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-800">
            Rekapitulasi Peserta Sah yang Diundi
          </div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Wilayah</th>
                <th className="px-4 py-2 font-medium">Keterangan Wilayah</th>
                <th className="px-4 py-2 font-medium text-right">Jumlah Wajib Pajak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {integritas.pesertaPerWilayah.map((rw) => (
                <tr key={rw.kode}>
                  <td className="px-4 py-2 font-semibold text-neutral-900">{rw.kode}</td>
                  <td className="px-4 py-2 text-neutral-700">{rw.nama}</td>
                  <td className="px-4 py-2 text-right font-medium text-neutral-900">
                    {rw.jumlahPeserta.toLocaleString('id-ID')} WP
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-50 font-semibold">
                <td colSpan={2} className="px-4 py-2 text-neutral-900">Total Seluruh Peserta Sah</td>
                <td className="px-4 py-2 text-right text-primary-700">
                  {integritas.totalPeserta.toLocaleString('id-ID')} WP
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KartuSlotPublik({ slot }: { slot: SlotPemenangPublik }): ReactElement {
  const isPemenang = slot.kode.includes('UTAMA') || slot.kode.includes('P1');
  const isPenerima = slot.penerimaAktif;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-shadow hover:shadow-md ${
        isPenerima
          ? 'border-primary-600 bg-white ring-2 ring-primary-600/20'
          : slot.status === 'GUGUR'
            ? 'border-neutral-200 bg-neutral-50 opacity-80'
            : 'border-neutral-200 bg-white'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                isPemenang
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-neutral-100 text-neutral-800'
              }`}
            >
              {slot.kode}
            </span>
            <span className="text-xs font-medium text-neutral-500">
              {isPemenang ? 'Pemenang Utama' : 'Cadangan Pengganti'}
            </span>
          </div>

          <BadgeStatusPublik status={slot.status} penerimaAktif={slot.penerimaAktif} />
        </div>

        {isPenerima && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <Trophy className="h-3 w-3 text-emerald-600" />
            Penerima Hadiah Umroh
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-base font-bold text-neutral-900 break-words">
            {slot.peserta.nama}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-neutral-500">
            NOP: {slot.peserta.nopMasked}
          </p>
          <p className="text-xs font-medium text-neutral-500">
            NIK: {slot.peserta.nikMasked}
          </p>
        </div>

        <div className="mt-3 text-xs text-neutral-600">
          <p className="line-clamp-2" title={slot.peserta.alamatWp}>
            {slot.peserta.alamatWp}
          </p>
          <p className="mt-0.5 font-medium text-neutral-700">
            Kel. {slot.peserta.kelurahan}, Kec. {slot.peserta.kecamatan}
          </p>
        </div>

        {/* Indikator Lunas 5 Tahun */}
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <span className="text-[11px] font-semibold text-neutral-500">Pelunasan PBB-P2 5 Tahun:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {['2022', '2023', '2024', '2025', '2026'].map((th) => (
              <span
                key={th}
                className="inline-flex items-center rounded-sm bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700"
              >
                {th}: Lunas
              </span>
            ))}
          </div>
        </div>
      </div>

      {slot.diperbaruiAt && (
        <div className="mt-4 border-t border-neutral-100 pt-2 text-[11px] text-neutral-400">
          Diperbarui {slot.diperbaruiAt}
        </div>
      )}
    </div>
  );
}

function BadgeStatusPublik({
  status,
  penerimaAktif: _penerimaAktif,
}: {
  status: string;
  penerimaAktif: boolean;
}): ReactElement {
  if (status === 'TERVERIFIKASI') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        <UserCheck className="h-3 w-3" />
        Terverifikasi
      </span>
    );
  }
  if (status === 'GUGUR') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
        <XCircle className="h-3 w-3" />
        Gugur
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
      <Clock className="h-3 w-3" />
      Kandidat
    </span>
  );
}
