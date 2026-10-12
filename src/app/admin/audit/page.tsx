import { ScrollText } from 'lucide-react';
import { type Metadata } from 'next';
import { type ReactElement } from 'react';

import { queryAudit } from '@/components/admin/audit/format';
import { FormFilterAudit } from '@/components/admin/audit/form-filter-audit';
import { TabelAudit } from '@/components/admin/audit/tabel-audit';
import { Alert } from '@/components/ui/alert';
import { NAMA_APLIKASI } from '@/config/brand';
import { FilterAuditSchema, type FilterAudit } from '@/lib/domain';
import { wajibPeran } from '@/server/auth/halaman';
import { daftarAudit, daftarLabelAktor } from '@/server/services/audit-log';

export const metadata: Metadata = { title: `Log Audit | ${NAMA_APLIKASI}` };

type LogAuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Hanya nilai pertama tiap parameter; parameter yang tidak dikenal diabaikan di halaman. */
function bacaQuery(query: Record<string, string | string[] | undefined>): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const kunci of ['aksi', 'aktor', 'dari', 'sampai', 'page', 'pageSize']) {
    const nilai = query[kunci];
    const pertama = Array.isArray(nilai) ? nilai[0] : nilai;
    if (pertama !== undefined) {
      hasil[kunci] = pertama;
    }
  }
  return hasil;
}

export default async function LogAuditPage({
  searchParams,
}: LogAuditPageProps): Promise<ReactElement> {
  await wajibPeran(['ADMIN']);
  const mentah = bacaQuery(await searchParams);
  const hasilFilter = FilterAuditSchema.safeParse(mentah);
  const galat: Record<string, string> = {};
  if (!hasilFilter.success) {
    for (const isu of hasilFilter.error.issues) {
      galat[String(isu.path[0] ?? '')] ??= isu.message;
    }
  }
  const filter: FilterAudit = hasilFilter.success ? hasilFilter.data : FilterAuditSchema.parse({});
  const [halaman, saranAktor] = await Promise.all([daftarAudit(filter), daftarLabelAktor()]);
  const jumlahHalaman = Math.max(1, Math.ceil(halaman.total / halaman.pageSize));
  const adaFilter = [filter.aksi, filter.aktor, filter.dari, filter.sampai].some(
    (nilai) => nilai !== undefined,
  );
  const tautan = (page: number): string =>
    `/admin/audit${queryAudit({ ...filter, page, pageSize: filter.pageSize === 50 ? undefined : filter.pageSize })}`;

  return (
    <section className="space-y-6">
      <h1 className="font-heading text-h1 font-bold text-neutral-900">Log Audit</h1>
      <FormFilterAudit
        nilai={hasilFilter.success ? filter : mentah}
        galat={galat}
        saranAktor={saranAktor}
      />
      {!hasilFilter.success && (
        <Alert jenis="galat" judul="Filter tidak valid. Perbaiki isian yang ditandai.">
          Menampilkan semua aktivitas tanpa filter.
        </Alert>
      )}

      {halaman.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-neutral-300 bg-neutral-0 p-12 text-center">
          <ScrollText aria-hidden="true" className="size-12 text-neutral-600" />
          <p className="text-base font-semibold text-neutral-900">
            {adaFilter
              ? 'Tidak ada aktivitas yang cocok dengan filter.'
              : 'Belum ada aktivitas tercatat.'}
          </p>
        </div>
      ) : (
        <>
          <TabelAudit baris={halaman.items} />
          <nav
            aria-label="Halaman log audit"
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <p className="text-sm text-neutral-600">
              Halaman {halaman.page.toString()} dari {jumlahHalaman.toString()} ·{' '}
              {halaman.total.toLocaleString('id-ID')} entri
            </p>
            <div className="flex gap-3">
              {halaman.page > 1 && (
                <a
                  href={tautan(halaman.page - 1)}
                  className="inline-flex h-11 items-center rounded-md border border-neutral-300 bg-neutral-0 px-5 text-base font-semibold text-primary-700 hover:bg-primary-100"
                >
                  Sebelumnya
                </a>
              )}
              {halaman.page < jumlahHalaman && (
                <a
                  href={tautan(halaman.page + 1)}
                  className="inline-flex h-11 items-center rounded-md border border-neutral-300 bg-neutral-0 px-5 text-base font-semibold text-primary-700 hover:bg-primary-100"
                >
                  Berikutnya
                </a>
              )}
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
