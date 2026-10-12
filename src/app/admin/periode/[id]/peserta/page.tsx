import { FileSpreadsheet } from 'lucide-react';
import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';

import { RingkasanPeserta } from '@/components/admin/peserta/ringkasan-peserta';
import { UnggahImpor } from '@/components/admin/peserta/unggah-impor';
import { Alert } from '@/components/ui/alert';
import { NAMA_APLIKASI } from '@/config/brand';
import { NAMA_WILAYAH_BAWAAN, PESAN_PERIODE_DITOLAK } from '@/lib/domain';
import { wajibPeran } from '@/server/auth/halaman';
import { ambilRingkasanPeserta } from '@/server/services/impor';
import { cariPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Data Peserta | ${NAMA_APLIKASI}` };

type HalamanPesertaProps = { params: Promise<{ id: string }> };

/** Tab Data Peserta (UX_FLOWS Flow 3): unggah file dan laporan validasi. */
export default async function HalamanPeserta({
  params,
}: HalamanPesertaProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const periode = await cariPeriode((await params).id);
  if (periode === null) {
    notFound();
  }
  const ringkasan = await ambilRingkasanPeserta(periode.id);
  const namaWilayah = {
    W1: periode.wilayah.find((w) => w.kode === 'W1')?.nama ?? NAMA_WILAYAH_BAWAAN.W1,
    W2: periode.wilayah.find((w) => w.kode === 'W2')?.nama ?? NAMA_WILAYAH_BAWAAN.W2,
  };
  const draf = periode.status === 'DRAF';

  return (
    <div className="space-y-6">
      {draf ? (
        <UnggahImpor
          periodeId={periode.id}
          version={periode.version}
          adaData={ringkasan !== null}
        />
      ) : (
        <Alert
          jenis="info"
          judul={
            periode.status === 'DIBATALKAN'
              ? PESAN_PERIODE_DITOLAK.PERIODE_SUDAH_DIBATALKAN
              : 'Periode sudah terkunci. Data tidak dapat diubah.'
          }
        />
      )}
      {ringkasan === null ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-neutral-300 bg-neutral-0 px-6 py-12 text-center shadow-sm">
          <FileSpreadsheet
            aria-hidden="true"
            className="size-12 text-neutral-600"
            strokeWidth={1.75}
          />
          <p className="text-base font-semibold text-neutral-900">Belum ada data peserta.</p>
          <p className="text-sm text-neutral-600">
            Unggah file ekspor PBB (CSV pemisah titik koma atau XLSX).
          </p>
          <a
            href="/contoh/format-impor.csv"
            download
            className="text-sm font-medium text-primary-700 underline underline-offset-2"
          >
            Unduh contoh format header
          </a>
        </div>
      ) : (
        <RingkasanPeserta ringkasan={ringkasan} namaWilayah={namaWilayah} />
      )}
    </div>
  );
}
