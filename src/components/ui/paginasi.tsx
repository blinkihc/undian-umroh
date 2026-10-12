import { type ReactElement } from 'react';

type PaginasiProps = {
  label: string;
  page: number;
  pageSize: number;
  total: number;
  /** Satuan jumlah, mis. "peserta" atau "entri". */
  satuan: string;
  /** Jalur dasar halaman tanpa query, mis. `/admin/periode/x/peserta`. */
  jalur: string;
  /** Filter aktif; nilai kosong tidak dimasukkan ke URL. */
  query: Readonly<Record<string, string | number | undefined>>;
};

/** Query string dengan nilai terisi saja. */
export function susunQuery(query: Readonly<Record<string, string | number | undefined>>): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(query)) {
    if (nilai !== undefined && nilai !== '') params.set(kunci, String(nilai));
  }
  const teks = params.toString();
  return teks === '' ? '' : `?${teks}`;
}

const GAYA_TAUTAN =
  'inline-flex h-11 items-center rounded-md border border-neutral-300 bg-neutral-0 px-5 text-base font-semibold text-primary-700 hover:bg-primary-100';

/** Navigasi halaman server: "Halaman x dari y · n satuan" + Sebelumnya/Berikutnya. */
export function Paginasi({
  label,
  page,
  pageSize,
  total,
  satuan,
  jalur,
  query,
}: PaginasiProps): ReactElement {
  const jumlahHalaman = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number): string =>
    `${jalur}${susunQuery({ ...query, page: p === 1 ? undefined : p, pageSize: pageSize === 50 ? undefined : pageSize })}`;
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-neutral-600">
        Halaman {page.toString()} dari {jumlahHalaman.toString()} · {total.toLocaleString('id-ID')}{' '}
        {satuan}
      </p>
      <div className="flex gap-3">
        {page > 1 && (
          <a href={href(page - 1)} className={GAYA_TAUTAN}>
            Sebelumnya
          </a>
        )}
        {page < jumlahHalaman && (
          <a href={href(page + 1)} className={GAYA_TAUTAN}>
            Berikutnya
          </a>
        )}
      </div>
    </nav>
  );
}
