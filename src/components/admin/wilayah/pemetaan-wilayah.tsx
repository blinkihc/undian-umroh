'use client';

import { CircleAlert, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';

import { kirimJson } from '@/client/api';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { hitungRingkasanWilayah, type KodeWilayah } from '@/lib/domain';

import { KartuWilayah } from './kartu-wilayah';

export type BarisPemetaanTampil = {
  kecamatan: string;
  wilayah: KodeWilayah | null;
  jumlahLolos: number;
  mirip: readonly string[];
};

type PemetaanWilayahProps = {
  periodeId: string;
  version: number;
  /** Pemetaan hanya dapat diubah saat Draf. */
  bolehUbah: boolean;
  /** Nama tampilan dapat diubah sampai Final. */
  bolehUbahNama: boolean;
  wilayah: readonly { kode: KodeWilayah; nama: string }[];
  kecamatan: readonly BarisPemetaanTampil[];
};

type Pesan = { jenis: 'info' | 'galat'; teks: string } | null;

const angka = new Intl.NumberFormat('id-ID');

const PILIHAN: readonly {
  nilai: KodeWilayah | null;
  label: (nama: Record<KodeWilayah, string>) => string;
}[] = [
  { nilai: 'W1', label: (n) => n.W1 },
  { nilai: 'W2', label: (n) => n.W2 },
  { nilai: null, label: () => '—' },
];

/**
 * Tab Wilayah (UX_FLOWS Flow 4): tombol segmen per kecamatan, panel kartu per wilayah dengan nama
 * tampilan yang dapat diedit, banner kecamatan belum dipetakan, simpan/batalkan perubahan.
 */
export function PemetaanWilayah(props: PemetaanWilayahProps): ReactElement {
  const { periodeId, version, bolehUbah, bolehUbahNama, wilayah, kecamatan } = props;
  const router = useRouter();
  const petaAwal = (): Map<string, KodeWilayah | null> =>
    new Map(kecamatan.map((k) => [k.kecamatan, k.wilayah]));
  const [pilihan, setPilihan] = useState(petaAwal);
  // Data server baru (setelah simpan atau muat ulang) mengganti pilihan lokal.
  const [dasar, setDasar] = useState(kecamatan);
  if (dasar !== kecamatan) {
    setDasar(kecamatan);
    setPilihan(petaAwal());
  }
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState<Pesan>(null);
  const nama: Record<KodeWilayah, string> = {
    W1: wilayah.find((w) => w.kode === 'W1')?.nama ?? 'Wilayah 1',
    W2: wilayah.find((w) => w.kode === 'W2')?.nama ?? 'Wilayah 2',
  };

  const berubah = kecamatan.filter((k) => (pilihan.get(k.kecamatan) ?? null) !== k.wilayah);
  const ringkasan = hitungRingkasanWilayah(
    kecamatan.map((k) => ({ ...k, wilayah: pilihan.get(k.kecamatan) ?? null })),
  );

  function pilih(kec: string, nilai: KodeWilayah | null): void {
    setPesan(null);
    setPilihan((lama) => new Map(lama).set(kec, nilai));
  }

  async function simpan(): Promise<void> {
    setMemuat(true);
    setPesan(null);
    const hasil = await kirimJson('PUT', `/api/periode/${periodeId}/wilayah`, {
      version,
      pemetaan: berubah.map((k) => ({
        kecamatan: k.kecamatan,
        wilayah: pilihan.get(k.kecamatan) ?? null,
      })),
    });
    setMemuat(false);
    if (hasil.ok) {
      setPesan({
        jenis: 'info',
        teks: `Pemetaan ${berubah.length.toString()} kecamatan disimpan.`,
      });
      router.refresh();
      return;
    }
    setPesan({ jenis: 'galat', teks: hasil.fields.pemetaan ?? hasil.message });
    if (hasil.status === 409) router.refresh();
  }

  const belum = ringkasan.BELUM_DIPETAKAN;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {pesan !== null && <Alert jenis={pesan.jenis} judul={pesan.teks} />}
        {!bolehUbah && (
          <Alert jenis="info" judul="Terkunci">
            Pemetaan wilayah hanya dapat diubah saat periode berstatus Draf.
          </Alert>
        )}
        {belum.jumlahKecamatan > 0 && (
          <Alert
            jenis="peringatan"
            judul={`${angka.format(belum.jumlahKecamatan)} kecamatan belum dipetakan (${angka.format(belum.jumlahLolos)} peserta lolos).`}
          >
            Kunci data diblokir sampai semua kecamatan dipetakan ke Wilayah 1 atau Wilayah 2.
          </Alert>
        )}
        <div className="overflow-x-auto rounded-md border border-neutral-300 bg-neutral-0 shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Pemetaan kecamatan ke wilayah</caption>
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Kecamatan
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Peserta lolos
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Wilayah
                </th>
              </tr>
            </thead>
            <tbody>
              {kecamatan.map((k) => {
                const sekarang = pilihan.get(k.kecamatan) ?? null;
                return (
                  <tr
                    key={k.kecamatan}
                    className="border-t border-neutral-300 align-top text-neutral-900"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">{k.kecamatan}</span>
                      {sekarang === null && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-pill bg-warning-100 px-2 py-0.5 text-sm font-medium text-warning-700">
                          <CircleAlert aria-hidden="true" className="size-4" />
                          Belum dipetakan
                        </span>
                      )}
                      {k.mirip.length > 0 && (
                        <span className="block text-sm text-neutral-600">
                          Mungkin sama dengan {k.mirip.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="angka-tabular px-4 py-3 text-right">
                      {angka.format(k.jumlahLolos)}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        role="radiogroup"
                        aria-label={`Wilayah untuk ${k.kecamatan}`}
                        className="inline-flex overflow-hidden rounded-md border border-neutral-300"
                      >
                        {PILIHAN.map((p) => {
                          const aktif = sekarang === p.nilai;
                          return (
                            <button
                              key={p.nilai ?? 'kosong'}
                              type="button"
                              role="radio"
                              aria-checked={aktif}
                              aria-label={p.nilai === null ? 'Belum dipilih' : p.label(nama)}
                              disabled={!bolehUbah || memuat}
                              onClick={() => {
                                pilih(k.kecamatan, p.nilai);
                              }}
                              className={`h-11 min-w-16 border-l border-neutral-300 px-3 text-sm font-medium first:border-l-0 disabled:cursor-not-allowed ${
                                aktif
                                  ? 'bg-primary-700 text-neutral-0'
                                  : 'bg-neutral-0 text-neutral-900 hover:bg-primary-100 disabled:text-neutral-600'
                              }`}
                            >
                              {p.label(nama)}
                            </button>
                          );
                        })}
                      </div>
                      {!bolehUbah && (
                        <span className="ml-2 inline-flex items-center gap-1 text-sm text-neutral-600">
                          <Lock aria-hidden="true" className="size-4" />
                          Terkunci
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {bolehUbah && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              memuat={memuat}
              labelMemuat="Menyimpan…"
              disabled={berubah.length === 0}
              onClick={() => {
                void simpan();
              }}
            >
              Simpan Pemetaan
            </Button>
            <Button
              varian="secondary"
              disabled={berubah.length === 0 || memuat}
              onClick={() => {
                setPilihan(petaAwal());
                setPesan(null);
              }}
            >
              Batalkan Perubahan
            </Button>
            <span className="text-sm text-neutral-600">
              {berubah.length === 0
                ? 'Tidak ada perubahan.'
                : `${berubah.length.toString()} perubahan belum disimpan.`}
            </span>
          </div>
        )}
      </div>
      <aside aria-label="Ringkasan wilayah" className="space-y-4">
        {(['W1', 'W2'] as const).map((kode) => (
          <KartuWilayah
            key={kode}
            periodeId={periodeId}
            version={version}
            kode={kode}
            nama={nama[kode]}
            bolehUbah={bolehUbahNama && !memuat}
            jumlahKecamatan={ringkasan[kode].jumlahKecamatan}
            jumlahLolos={ringkasan[kode].jumlahLolos}
          />
        ))}
        {belum.jumlahKecamatan > 0 && (
          <div className="rounded-md border border-warning-700 bg-warning-100 p-4">
            <p className="text-base font-semibold text-neutral-900">Belum dipetakan</p>
            <p className="mt-1 text-sm text-neutral-900">
              {angka.format(belum.jumlahKecamatan)} kecamatan · {angka.format(belum.jumlahLolos)}{' '}
              peserta lolos
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
