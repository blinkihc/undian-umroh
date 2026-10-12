import { type ReactElement } from 'react';

import { Alert } from '@/components/ui/alert';
import { formatWaktuWib, pesanAlasan, type KodeAlasan } from '@/lib/domain';

export type RingkasanPesertaTampil = {
  namaFile: string;
  diimporAt: string;
  totalBaris: number;
  jumlahLolos: number;
  jumlahGugur: number;
  lolosPerWilayah: { W1: number; W2: number; BELUM_DIPETAKAN: number };
  gugurPerAlasan: Partial<Record<KodeAlasan, number>>;
  nikTidakValid: number;
  nopGanda: number;
  kecamatanBelumDipetakan: readonly string[];
};

const angka = new Intl.NumberFormat('id-ID');

function Kartu({
  judul,
  nilai,
  keterangan,
}: {
  judul: string;
  nilai: number;
  keterangan?: string;
}): ReactElement {
  return (
    <div className="rounded-md border border-neutral-300 bg-neutral-0 p-4 shadow-sm">
      <p className="text-sm font-medium text-neutral-600">{judul}</p>
      <p className="angka-tabular mt-1 font-heading text-h2 font-bold text-neutral-900">
        {angka.format(nilai)}
      </p>
      {keterangan !== undefined && <p className="mt-1 text-sm text-neutral-600">{keterangan}</p>}
    </div>
  );
}

/**
 * Laporan impor (UX_FLOWS Flow 3): kartu ringkasan, banner kecamatan belum terpetakan, dan
 * tabel gugur per alasan.
 */
export function RingkasanPeserta({
  ringkasan,
  namaWilayah,
}: {
  ringkasan: RingkasanPesertaTampil;
  namaWilayah: { W1: string; W2: string };
}): ReactElement {
  const perAlasan = Object.entries(ringkasan.gugurPerAlasan) as [KodeAlasan, number][];
  const belum = ringkasan.kecamatanBelumDipetakan.length;
  const lolos = ringkasan.lolosPerWilayah;
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600">
        Impor terakhir: <span className="font-medium text-neutral-900">{ringkasan.namaFile}</span> ·{' '}
        <span className="angka-tabular">{formatWaktuWib(new Date(ringkasan.diimporAt))}</span>
      </p>
      <section
        aria-label="Ringkasan data peserta"
        className="grid gap-4 md:grid-cols-3 xl:grid-cols-5"
      >
        <Kartu judul="Total baris" nilai={ringkasan.totalBaris} />
        <Kartu
          judul="Lolos"
          nilai={ringkasan.jumlahLolos}
          keterangan={`${namaWilayah.W1} ${angka.format(lolos.W1)} · ${namaWilayah.W2} ${angka.format(lolos.W2)} · Belum dipetakan ${angka.format(lolos.BELUM_DIPETAKAN)}`}
        />
        <Kartu judul="Gugur" nilai={ringkasan.jumlahGugur} />
        <Kartu
          judul="NOP ganda"
          nilai={ringkasan.nopGanda}
          keterangan="NOP berbeda yang muncul lebih dari sekali"
        />
        <Kartu
          judul="Peringatan NIK"
          nilai={ringkasan.nikTidakValid}
          keterangan="Tidak menggugurkan"
        />
      </section>
      {belum > 0 && (
        <Alert
          jenis="peringatan"
          judul={`${angka.format(belum)} kecamatan belum dipetakan ke wilayah.`}
        >
          {`${angka.format(lolos.BELUM_DIPETAKAN)} peserta lolos belum masuk wilayah mana pun. Kunci data diblokir sampai semua kecamatan dipetakan.`}
        </Alert>
      )}
      <section
        aria-labelledby="judul-gugur-per-alasan"
        className="rounded-md border border-neutral-300 bg-neutral-0 shadow-sm"
      >
        <h2
          id="judul-gugur-per-alasan"
          className="px-4 pt-4 font-heading text-h3 font-semibold text-neutral-900"
        >
          Gugur per alasan
        </h2>
        {perAlasan.length === 0 ? (
          <p className="px-4 py-4 text-sm text-neutral-600">Tidak ada baris yang gugur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-left text-sm">
              <caption className="sr-only">Jumlah baris gugur per kode alasan</caption>
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Kode
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Alasan
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody>
                {perAlasan.map(([kode, jumlah]) => (
                  <tr key={kode} className="border-t border-neutral-300">
                    <td className="px-4 py-3 font-mono text-neutral-900">{kode}</td>
                    <td className="px-4 py-3 text-neutral-900">{pesanAlasan(kode)}</td>
                    <td className="angka-tabular px-4 py-3 text-right text-neutral-900">
                      {angka.format(jumlah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
