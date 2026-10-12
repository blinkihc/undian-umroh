'use client';

import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';

import { unggahForm } from '@/client/unggah';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type UnggahImporProps = {
  periodeId: string;
  version: number;
  /** Periode sudah punya data peserta: impor ulang butuh konfirmasi. */
  adaData: boolean;
};

type Tahap = 'diam' | 'konfirmasi' | 'mengunggah' | 'memproses';

type Pesan = { jenis: 'info' | 'galat'; judul: string; isi?: string } | null;

const UKURAN_MAKS = 20 * 1024 * 1024;
const angka = new Intl.NumberFormat('id-ID');

type HasilImpor = { totalBaris: number; jumlahLolos: number; jumlahGugur: number };

/**
 * Unggah file impor (UX_FLOWS Flow 3): konfirmasi impor ulang, kemajuan bertahap, peringatan
 * saat halaman hendak ditutup selama proses, dan ringkasan hasil.
 */
export function UnggahImpor({ periodeId, version, adaData }: UnggahImporProps): ReactElement {
  const router = useRouter();
  const idInput = useId();
  const input = useRef<HTMLInputElement>(null);
  const [tahap, setTahap] = useState<Tahap>('diam');
  const [kemajuan, setKemajuan] = useState(0);
  const [galatFile, setGalatFile] = useState<string | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const sibuk = tahap === 'mengunggah' || tahap === 'memproses';

  useEffect(() => {
    if (!sibuk) return undefined;
    const tahan = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', tahan);
    return () => {
      window.removeEventListener('beforeunload', tahan);
    };
  }, [sibuk]);

  function fileTerpilih(): File | null {
    const file = input.current?.files?.[0] ?? null;
    if (file === null) {
      setGalatFile('Pilih file .csv atau .xlsx.');
      return null;
    }
    if (file.size > UKURAN_MAKS) {
      setGalatFile('File harus .csv atau .xlsx, maksimal 20 MB.');
      return null;
    }
    setGalatFile(null);
    return file;
  }

  function mulai(): void {
    setPesan(null);
    if (fileTerpilih() === null) return;
    if (adaData) {
      setTahap('konfirmasi');
      return;
    }
    void unggah();
  }

  async function unggah(): Promise<void> {
    const file = fileTerpilih();
    if (file === null) {
      setTahap('diam');
      return;
    }
    const form = new FormData();
    form.set('file', file);
    form.set('version', String(version));
    setKemajuan(0);
    setTahap('mengunggah');
    const hasil = await unggahForm<HasilImpor>(`/api/periode/${periodeId}/impor`, form, (b) => {
      setKemajuan(b);
      if (b >= 1) setTahap('memproses');
    });
    setTahap('diam');
    if (hasil.ok) {
      setPesan({
        jenis: 'info',
        judul: `Impor selesai: ${angka.format(hasil.data.totalBaris)} baris, ${angka.format(hasil.data.jumlahLolos)} lolos, ${angka.format(hasil.data.jumlahGugur)} gugur.`,
      });
      if (input.current !== null) input.current.value = '';
      router.refresh();
      return;
    }
    setPesan({ jenis: 'galat', judul: 'Impor ditolak.', isi: hasil.message });
    if (hasil.status === 409) router.refresh();
  }

  return (
    <section
      aria-labelledby="judul-unggah-impor"
      className="space-y-4 rounded-md border border-neutral-300 bg-neutral-0 p-6 shadow-sm"
    >
      <h2 id="judul-unggah-impor" className="font-heading text-h3 font-semibold text-neutral-900">
        {adaData ? 'Impor Ulang Data' : 'Unggah Data Peserta'}
      </h2>
      {pesan !== null && (
        <Alert jenis={pesan.jenis} judul={pesan.judul}>
          {pesan.isi}
        </Alert>
      )}
      <div>
        <label htmlFor={idInput} className="text-sm font-medium text-neutral-900">
          File ekspor PBB (.csv pemisah titik koma, maksimal 20 MB)
        </label>
        <input
          ref={input}
          id={idInput}
          type="file"
          accept=".csv,.xlsx,text/csv"
          disabled={sibuk}
          aria-invalid={galatFile !== null}
          aria-describedby={galatFile === null ? undefined : `${idInput}-galat`}
          onChange={() => {
            setGalatFile(null);
            if (tahap === 'konfirmasi') setTahap('diam');
          }}
          className="mt-1 block w-full text-sm text-neutral-900 file:mr-4 file:h-11 file:rounded-md file:border file:border-neutral-300 file:bg-neutral-0 file:px-4 file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
        />
        {galatFile !== null && (
          <p
            id={`${idInput}-galat`}
            className="mt-1 flex items-start gap-1 text-sm text-danger-700"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{galatFile}</span>
          </p>
        )}
      </div>
      {sibuk && (
        <div className="space-y-2" aria-live="polite">
          <p className="text-sm font-medium text-neutral-900">
            {tahap === 'mengunggah'
              ? `Mengunggah… ${Math.round(kemajuan * 100).toString()}%`
              : 'Memproses baris dan menyimpan… Jangan tutup halaman ini.'}
          </p>
          {/* <progress> tanpa nilai = tak tentu (tahap memproses); tanpa style inline (CSP). */}
          <progress
            aria-label="Kemajuan impor"
            max={100}
            {...(tahap === 'mengunggah' && { value: Math.round(kemajuan * 100) })}
            className="h-2 w-full overflow-hidden rounded-pill accent-primary-700"
          />
        </div>
      )}
      {tahap === 'konfirmasi' ? (
        <div
          className="flex flex-wrap items-center gap-3"
          role="group"
          aria-label="Konfirmasi impor ulang"
        >
          <p className="text-sm text-neutral-900">
            Impor ulang akan mengganti seluruh data peserta periode ini. Lanjutkan?
          </p>
          <Button
            onClick={() => {
              void unggah();
            }}
          >
            Ya, impor ulang
          </Button>
          <Button
            varian="secondary"
            onClick={() => {
              setTahap('diam');
            }}
          >
            Batal
          </Button>
        </div>
      ) : (
        <Button onClick={mulai} memuat={sibuk} labelMemuat="Memproses…">
          Unggah File
        </Button>
      )}
    </section>
  );
}
