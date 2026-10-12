import { type ReactElement, type ReactNode } from 'react';

import { formatTanggal, formatWaktuWib, type KodeWilayah, type StatusPeriode } from '@/lib/domain';

export type PeriodeDetailTampil = {
  id: string;
  slug: string;
  judul: string;
  status: StatusPeriode;
  tahunAwal: number;
  tahunAkhir: number;
  batasLunas: string;
  tanggalAcara: string | null;
  lokasiAcara: string | null;
  wilayah: readonly { kode: KodeWilayah; nama: string }[];
  alasanBatal: string | null;
  createdAt: string;
  version: number;
};

function Baris({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div className="grid gap-1 border-t border-neutral-300 py-3 first:border-t-0 md:grid-cols-[220px_1fr]">
      <dt className="text-sm font-medium text-neutral-600">{label}</dt>
      <dd className="text-base text-neutral-900">{children}</dd>
    </div>
  );
}

/** Pengaturan periode dalam bentuk baca-saja (Admin dan Operator); judul ada di `KepalaPeriode`. */
export function RingkasanPeriode({ periode }: { periode: PeriodeDetailTampil }): ReactElement {
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="judul-pengaturan-periode"
        className="rounded-md border border-neutral-300 bg-neutral-0 p-6 shadow-sm"
      >
        <h2
          id="judul-pengaturan-periode"
          className="font-heading text-h3 font-semibold text-neutral-900"
        >
          Pengaturan Periode
        </h2>
        <dl className="mt-4">
          <Baris label="Tahun pajak">
            {`${periode.tahunAwal.toString()}–${periode.tahunAkhir.toString()} (wajib lunas semua)`}
          </Baris>
          <Baris label="Batas lunas">
            <span className="angka-tabular">{formatWaktuWib(new Date(periode.batasLunas))}</span>
          </Baris>
          <Baris label="Tanggal acara">
            {periode.tanggalAcara === null
              ? 'Belum ditentukan'
              : formatTanggal(periode.tanggalAcara)}
          </Baris>
          <Baris label="Lokasi acara">{periode.lokasiAcara ?? 'Belum ditentukan'}</Baris>
          {periode.wilayah.map((w) => (
            <Baris key={w.kode} label={`Nama ${w.kode === 'W1' ? 'Wilayah 1' : 'Wilayah 2'}`}>
              {w.nama}
            </Baris>
          ))}
          <Baris label="Slug">
            <span className="font-mono">{periode.slug}</span>
          </Baris>
          <Baris label="Dibuat">
            <span className="angka-tabular">{formatWaktuWib(new Date(periode.createdAt))}</span>
          </Baris>
        </dl>
      </section>
    </div>
  );
}
