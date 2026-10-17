import { FileSpreadsheet } from 'lucide-react';
import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';

import { FormFilterPeserta } from '@/components/admin/peserta/form-filter-peserta';
import { RingkasanPeserta } from '@/components/admin/peserta/ringkasan-peserta';
import { TabelPeserta } from '@/components/admin/peserta/tabel-peserta';
import { UnggahImpor } from '@/components/admin/peserta/unggah-impor';
import { Alert } from '@/components/ui/alert';
import { Paginasi } from '@/components/ui/paginasi';
import { NAMA_APLIKASI } from '@/config/brand';
import {
  FilterPesertaSchema,
  NAMA_WILAYAH_BAWAAN,
  PESAN_PERIODE_DITOLAK,
  type FilterPeserta,
} from '@/lib/domain';
import { wajibPeran } from '@/server/auth/halaman';
import { ambilRingkasanPeserta } from '@/server/services/impor';
import { cariPeriode } from '@/server/services/periode';
import { daftarKecamatanPeserta, daftarPeserta } from '@/server/services/peserta';

export const metadata: Metadata = { title: `Data Peserta | ${NAMA_APLIKASI}` };

type HalamanPesertaProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const KUNCI_FILTER = ['status', 'wilayah', 'kecamatan', 'alasan', 'q', 'page', 'pageSize'];

/** Nilai pertama tiap parameter filter yang dikenal; parameter lain diabaikan di halaman. */
function bacaQuery(query: Record<string, string | string[] | undefined>): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const kunci of KUNCI_FILTER) {
    const nilai = query[kunci];
    const pertama = Array.isArray(nilai) ? nilai[0] : nilai;
    if (pertama !== undefined) hasil[kunci] = pertama;
  }
  return hasil;
}

/** Tab Data Peserta (UX_FLOWS Flow 3): unggah file, laporan validasi, dan tabel peserta. */
export default async function HalamanPeserta({
  params,
  searchParams,
}: HalamanPesertaProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const periode = await cariPeriode((await params).id);
  if (periode === null) {
    notFound();
  }
  const jalur = `/admin/periode/${periode.id}/peserta`;
  const mentah = bacaQuery(await searchParams);
  const hasilFilter = FilterPesertaSchema.safeParse(mentah);
  const galat: Record<string, string> = {};
  if (!hasilFilter.success) {
    for (const isu of hasilFilter.error.issues) galat[String(isu.path[0] ?? '')] ??= isu.message;
  }
  const filter: FilterPeserta = hasilFilter.success
    ? hasilFilter.data
    : FilterPesertaSchema.parse({});
  const ringkasan = await ambilRingkasanPeserta(periode.id);
  const [halaman, kecamatan] =
    ringkasan === null
      ? [null, []]
      : await Promise.all([daftarPeserta(periode.id, filter), daftarKecamatanPeserta(periode.id)]);
  const adaFilter = [filter.status, filter.wilayah, filter.kecamatan, filter.alasan, filter.q].some(
    (v) => v !== undefined,
  );
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
        <RingkasanPeserta
          ringkasan={ringkasan}
          namaWilayah={namaWilayah}
          hrefWilayah={`/admin/periode/${periode.id}/wilayah`}
        />
      )}
      {ringkasan !== null && halaman !== null && (
        <section aria-labelledby="judul-tabel-peserta" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2
              id="judul-tabel-peserta"
              className="font-heading text-h3 font-semibold text-neutral-900"
            >
              Tabel Peserta
            </h2>
            {ringkasan.jumlahGugur > 0 && (
              <a
                href={`/api/periode/${periode.id}/peserta/ekspor-gugur`}
                download
                className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 bg-neutral-0 px-5 text-base font-semibold text-primary-700 hover:bg-primary-100"
              >
                Ekspor Daftar Gugur (Excel)
              </a>
            )}
          </div>
          <FormFilterPeserta
            jalur={jalur}
            nilai={hasilFilter.success ? filter : mentah}
            galat={galat}
            kecamatan={kecamatan}
            namaWilayah={namaWilayah}
          />
          {!hasilFilter.success && (
            <Alert jenis="galat" judul="Filter tidak valid. Perbaiki isian yang ditandai.">
              Menampilkan semua peserta tanpa filter.
            </Alert>
          )}
          {halaman.items.length === 0 ? (
            <div className="rounded-md border border-neutral-300 bg-neutral-0 p-12 text-center">
              <p className="text-base font-semibold text-neutral-900">
                {adaFilter
                  ? 'Tidak ada peserta yang cocok dengan filter.'
                  : 'Tidak ada peserta di halaman ini.'}
              </p>
            </div>
          ) : (
            <>
              <TabelPeserta
                baris={halaman.items}
                periodeId={periode.id}
                bisaUbah={draf}
              />
              <Paginasi
                label="Halaman tabel peserta"
                page={halaman.page}
                pageSize={halaman.pageSize}
                total={halaman.total}
                satuan="peserta"
                jalur={jalur}
                query={{
                  status: filter.status,
                  wilayah: filter.wilayah,
                  kecamatan: filter.kecamatan,
                  alasan: filter.alasan,
                  q: filter.q,
                }}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
