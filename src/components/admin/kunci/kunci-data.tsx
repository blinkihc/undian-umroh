'use client';

import { CheckCircle2, Copy, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';

export type PrasyaratKunci = {
  semuaKecamatanTerpetakan: boolean;
  kecamatanBelumDipetakan: number;
  tanpaNopGanda: boolean;
  nopGanda: number;
  pesertaCukup: boolean;
  wilayahKurangPeserta: ('W1' | 'W2')[];
  jumlahPeserta: { W1: number; W2: number };
  siapKunci: boolean;
  status: string;
  snapshot: {
    hash: string;
    hashRingkas: string;
    lockedAt: string;
    jumlahW1: number;
    jumlahW2: number;
  } | null;
  version: number;
  judul: string;
};

type KunciDataProps = {
  periodeId: string;
  prasyarat: PrasyaratKunci;
};

export function KunciData({ periodeId, prasyarat }: KunciDataProps): ReactElement {
  const router = useRouter();
  const [bukaDialog, setBukaDialog] = useState(false);
  const [bukaKunciDialog, setBukaKunciDialog] = useState(false);
  const [konfirmasiJudul, setKonfirmasiJudul] = useState('');
  const [alasanBukaKunci, setAlasanBukaKunci] = useState('');
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [tersalin, setTersalin] = useState(false);

  const {
    semuaKecamatanTerpetakan,
    kecamatanBelumDipetakan,
    tanpaNopGanda,
    nopGanda,
    pesertaCukup,
    wilayahKurangPeserta,
    jumlahPeserta,
    siapKunci,
    status,
    snapshot,
    version,
    judul,
  } = prasyarat;

  const sudahTerkunci = status !== 'DRAF' && snapshot !== null;

  async function jalankanKunci(): Promise<void> {
    setMemproses(true);
    setGalat(null);
    try {
      const respons = await fetch(`/api/periode/${periodeId}/kunci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, konfirmasiJudul }),
      });
      const data = (await respons.json()) as { error?: { message: string } };
      if (!respons.ok) {
        setGalat(data.error?.message ?? 'Gagal mengunci periode.');
        return;
      }
      setBukaDialog(false);
      router.refresh();
    } catch {
      setGalat('Terjadi kesalahan jaringan.');
    } finally {
      setMemproses(false);
    }
  }

  async function jalankanBukaKunci(): Promise<void> {
    setMemproses(true);
    setGalat(null);
    try {
      const respons = await fetch(`/api/periode/${periodeId}/kunci/buka`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, alasan: alasanBukaKunci }),
      });
      const data = (await respons.json()) as { error?: { message: string } };
      if (!respons.ok) {
        setGalat(data.error?.message ?? 'Gagal membuka kunci periode.');
        return;
      }
      setBukaKunciDialog(false);
      router.refresh();
    } catch {
      setGalat('Terjadi kesalahan jaringan.');
    } finally {
      setMemproses(false);
    }
  }

  async function salinHash(): Promise<void> {
    if (snapshot?.hash === undefined) return;
    await navigator.clipboard.writeText(snapshot.hash);
    setTersalin(true);
    setTimeout(() => {
      setTersalin(false);
    }, 2000);
  }

  if (sudahTerkunci) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-8 text-primary-700" />
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Data Peserta Terkunci</h2>
              <p className="text-sm text-neutral-600">
                Daftar peserta telah dibekukan pada {snapshot.lockedAt} WIB.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-neutral-200 bg-neutral-0 p-4">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                Peserta Wilayah 1
              </span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {snapshot.jumlahW1.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 bg-neutral-0 p-4">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                Peserta Wilayah 2
              </span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {snapshot.jumlahW2.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-neutral-300 bg-neutral-0 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                Sidik Digital (SHA-256)
              </span>
              <button
                type="button"
                onClick={() => {
                  void salinHash();
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-800"
              >
                <Copy className="size-3.5" />
                {tersalin ? 'Tersalin!' : 'Salin Hash'}
              </button>
            </div>
            <p className="mt-2 font-mono text-xl font-bold tracking-widest text-primary-900">
              {snapshot.hashRingkas}
            </p>
            <p className="mt-1 font-mono text-xs break-all text-neutral-500">{snapshot.hash}</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              varian="secondary"
              onClick={() => {
                setGalat(null);
                setAlasanBukaKunci('');
                setBukaKunciDialog(true);
              }}
              className="border-danger-300 text-danger-700 hover:bg-danger-50"
            >
              Buka Kunci Data
            </Button>
            <Link
              href={`/admin/periode/${periodeId}/paket`}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary-700 px-5 text-sm font-medium text-neutral-0 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2"
            >
              Lanjut ke Paket Undian →
            </Link>
          </div>
        </div>

        {bukaKunciDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-neutral-0 p-6 shadow-xl">
              <h3 className="text-lg font-bold text-neutral-900">Konfirmasi Buka Kunci Data</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Membuka kunci data akan mengembalikan status periode ke <strong>DRAF</strong>.
                Snapshot dan paket unduhan yang sudah dibuat akan dihapus, dan harus dibuat ulang setelah data dikunci kembali.
              </p>
              <label className="mt-4 block text-xs font-semibold text-neutral-700">
                Alasan buka kunci (minimal 5 karakter):
              </label>
              <textarea
                value={alasanBukaKunci}
                onChange={(e) => {
                  setAlasanBukaKunci(e.target.value);
                }}
                rows={3}
                placeholder="Contoh: Perbaikan pemetaan kecamatan atau data peserta yang keliru"
                className="mt-1.5 w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:border-primary-500 focus:outline-none"
              />
              {galat && <p className="mt-2 text-xs font-medium text-danger-600">{galat}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  varian="secondary"
                  onClick={() => {
                    setBukaKunciDialog(false);
                  }}
                  disabled={memproses}
                >
                  Batal
                </Button>
                <Button
                  varian="danger"
                  onClick={() => {
                    void jalankanBukaKunci();
                  }}
                  disabled={alasanBukaKunci.trim().length < 5 || memproses}
                  memuat={memproses}
                  labelMemuat="Membuka Kunci..."
                >
                  Buka Kunci Sekarang
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">Prasyarat Penguncian Data</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Sebelum data dikunci dan paket undian dibuat, seluruh prasyarat berikut wajib terpenuhi.
        </p>

        <ul className="mt-6 space-y-4">
          <li className="flex items-start gap-3">
            {semuaKecamatanTerpetakan ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-600" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-danger-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-neutral-900">Semua kecamatan terpetakan</p>
              <p className="text-xs text-neutral-500">
                {semuaKecamatanTerpetakan
                  ? 'Seluruh kecamatan data impor sudah memiliki wilayah.'
                  : `${kecamatanBelumDipetakan.toString()} kecamatan belum dipetakan ke Wilayah 1 atau Wilayah 2.`}
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            {tanpaNopGanda ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-600" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-danger-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-neutral-900">Tidak ada NOP ganda</p>
              <p className="text-xs text-neutral-500">
                {tanpaNopGanda
                  ? 'Tidak ada nomor objek pajak duplikat di data impor aktif.'
                  : `Terdapat ${nopGanda.toString()} NOP duplikat yang wajib diperbaiki.`}
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            {pesertaCukup ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-600" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-danger-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                Minimal 3 peserta lolos per wilayah
              </p>
              <p className="text-xs text-neutral-500">
                Wilayah 1: {jumlahPeserta.W1.toLocaleString('id-ID')} peserta | Wilayah 2:{' '}
                {jumlahPeserta.W2.toLocaleString('id-ID')} peserta.
                {wilayahKurangPeserta.length > 0 &&
                  ` (${wilayahKurangPeserta.join(', ')} kurang dari 3 peserta).`}
              </p>
            </div>
          </li>
        </ul>

        <div className="mt-8 flex justify-end">
          <Button
            varian="primary"
            disabled={!siapKunci}
            onClick={() => {
              setBukaDialog(true);
            }}
          >
            Kunci Data Peserta
          </Button>
        </div>
      </div>

      {bukaDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-neutral-0 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900">Konfirmasi Kunci Data</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Setelah dikunci, data peserta dan pemetaan wilayah{' '}
              <strong>tidak dapat diubah lagi</strong>.
            </p>
            <p className="mt-4 text-xs font-semibold text-neutral-700">
              Ketik judul periode berikut untuk konfirmasi:
            </p>
            <p className="mt-1 rounded bg-neutral-100 p-2 font-mono text-xs select-all text-neutral-800">
              {judul}
            </p>

            <input
              type="text"
              value={konfirmasiJudul}
              onChange={(e) => {
                setKonfirmasiJudul(e.target.value);
              }}
              placeholder="Ketik judul periode di sini"
              className="mt-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />

            {galat && <p className="mt-2 text-xs font-medium text-danger-600">{galat}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                varian="secondary"
                onClick={() => {
                  setBukaDialog(false);
                }}
                disabled={memproses}
              >
                Batal
              </Button>
              <Button
                varian="danger"
                onClick={() => {
                  void jalankanKunci();
                }}
                disabled={konfirmasiJudul !== judul || memproses}
                memuat={memproses}
                labelMemuat="Mengunci..."
              >
                Kunci Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
