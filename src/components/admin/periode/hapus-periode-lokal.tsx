'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';

import { kirimJson } from '@/client/api';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { type StatusPeriode } from '@/lib/domain';

type HapusPeriodeLokalProps = {
  id: string;
  judul: string;
  status: StatusPeriode;
};

/**
 * Tombol hapus periode khusus lingkungan pengujian lokal (NODE_ENV !== 'production').
 * Memungkinkan pembersihan data pengujian termasuk periode yang terkunci.
 */
export function HapusPeriodeLokal({ id, judul, status }: HapusPeriodeLokalProps): ReactElement | null {
  const router = useRouter();
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Jangan render di lingkungan produksi
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  async function handleHapus(): Promise<void> {
    setMemuat(true);
    setGalat(null);

    const hasil = await kirimJson<{ ok: true; id: string; judul: string }>('DELETE', `/api/periode/${id}`);

    if (hasil.ok) {
      router.push('/admin/periode');
      router.refresh();
      return;
    }

    setMemuat(false);
    setGalat(hasil.message || 'Gagal menghapus periode.');
  }

  return (
    <section
      aria-labelledby="judul-hapus-lokal"
      className="space-y-4 rounded-md border-2 border-dashed border-danger-700/60 bg-danger-50/40 p-6 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-danger-700 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-neutral-0">
          Tahap Lokal / Dev Only
        </span>
        <h2 id="judul-hapus-lokal" className="font-heading text-h3 font-semibold text-danger-900">
          Hapus Periode (Testing Stage)
        </h2>
      </div>

      <p className="text-sm text-neutral-700">
        Khusus pengembangan dan pengujian lokal: Menghapus periode <strong className="text-neutral-900">&ldquo;{judul}&rdquo;</strong> (Status: <span className="font-semibold">{status}</span>) beserta seluruh relasi data (impor peserta, kecamatan wilayah, snapshot bukti, dan hasil undian).
      </p>

      {galat !== null && (
        <Alert jenis="galat" judul="Gagal menghapus periode">
          {galat}
        </Alert>
      )}

      {konfirmasi ? (
        <div className="rounded-md border border-danger-700 bg-neutral-0 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-danger-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-neutral-900">
                Apakah Anda benar-benar yakin ingin menghapus periode ini?
              </p>
              <p className="text-neutral-600 mt-0.5">
                Semua data peserta, impor, snapshot, dan hasil undian terkait akan dihapus permanen dari basis data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              varian="danger"
              memuat={memuat}
              labelMemuat="Menghapus..."
              onClick={() => void handleHapus()}
            >
              Ya, Hapus Sekarang
            </Button>
            <Button
              varian="secondary"
              disabled={memuat}
              onClick={() => {
                setKonfirmasi(false);
                setGalat(null);
              }}
            >
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <Button
          varian="danger"
          onClick={() => {
            setKonfirmasi(true);
            setGalat(null);
          }}
        >
          Hapus Periode Ini (Lokal)
        </Button>
      )}
    </section>
  );
}
