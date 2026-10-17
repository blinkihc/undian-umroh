'use client';

import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TAHUN_LUNAS, formatWaktuWib, pesanAlasan } from '@/lib/domain';

export type PesertaTampil = {
  id: string;
  baris: number;
  nopFormat: string;
  nikMasked: string;
  nama: string;
  kecamatan: string;
  kelurahan: string;
  lunas: Readonly<Record<string, string | null>>;
  lunasRaw: Readonly<Record<string, string>>;
  eligible: boolean;
  alasan: readonly string[];
};

type TabelPesertaProps = {
  baris: readonly PesertaTampil[];
  periodeId?: string;
  bisaUbah?: boolean;
};

/** Tanggal lunas terbaca dalam WIB; nilai yang tidak terbaca ditampilkan apa adanya. */
function selLunas(lunas: string | null, raw: string): string {
  if (lunas !== null) return formatWaktuWib(new Date(lunas)).replace(' WIB', '');
  return raw === '' ? '—' : raw;
}

const KOLOM_DASAR = [
  'Baris',
  'NOP',
  'NIK',
  'Nama',
  'Kecamatan',
  'Kelurahan',
  ...TAHUN_LUNAS.map((t) => `Lunas ${t.toString()}`),
  'Status',
  'Alasan',
];

/**
 * Tabel peserta admin (UX_FLOWS Flow 3): NOP bertitik utuh, NIK tersamar, lima tanggal lunas
 * (WIB), status, semua alasan gugur beserta pesannya, dan aksi diskualifikasi manual.
 */
export function TabelPeserta({
  baris,
  periodeId,
  bisaUbah = false,
}: TabelPesertaProps): ReactElement {
  const router = useRouter();
  const [pesertaTerpilih, setPesertaTerpilih] = useState<PesertaTampil | null>(null);
  const [alasanGugur, setAlasanGugur] = useState('');
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const kolom = periodeId ? [...KOLOM_DASAR, 'Aksi'] : KOLOM_DASAR;

  async function jalankanGugur(): Promise<void> {
    if (!periodeId || !pesertaTerpilih) return;
    setMemproses(true);
    setGalat(null);
    try {
      const respons = await fetch(
        `/api/periode/${periodeId}/peserta/${pesertaTerpilih.id}/gugur`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alasan: alasanGugur }),
        },
      );
      const data = (await respons.json()) as { error?: { message: string } };
      if (!respons.ok) {
        setGalat(data.error?.message ?? 'Gagal menggugurkan peserta.');
        return;
      }
      setPesertaTerpilih(null);
      router.refresh();
    } catch {
      setGalat('Terjadi kesalahan jaringan.');
    } finally {
      setMemproses(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-neutral-300 bg-neutral-0 shadow-sm">
        <table className="w-full min-w-[1600px] text-left text-sm">
          <caption className="sr-only">Daftar peserta hasil impor; waktu lunas dalam WIB</caption>
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              {kolom.map((judulKolom) => (
                <th
                  key={judulKolom}
                  scope="col"
                  className="px-3 py-3 font-semibold whitespace-nowrap"
                >
                  {judulKolom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baris.map((p) => (
              <tr key={p.id} className="border-t border-neutral-300 align-top text-neutral-900">
                <td className="angka-tabular px-3 py-3">{p.baris}</td>
                <td className="px-3 py-3 font-mono whitespace-nowrap">{p.nopFormat}</td>
                <td className="px-3 py-3 font-mono whitespace-nowrap">{p.nikMasked}</td>
                <td className="px-3 py-3 font-medium">{p.nama === '' ? '—' : p.nama}</td>
                <td className="px-3 py-3">{p.kecamatan === '' ? '—' : p.kecamatan}</td>
                <td className="px-3 py-3">{p.kelurahan === '' ? '—' : p.kelurahan}</td>
                {TAHUN_LUNAS.map((t) => (
                  <td key={t} className="angka-tabular px-3 py-3 whitespace-nowrap">
                    {selLunas(p.lunas[t.toString()] ?? null, p.lunasRaw[t.toString()] ?? '')}
                  </td>
                ))}
                <td className="px-3 py-3">
                  {p.eligible ? (
                    <Chip nada="sukses" Ikon={Check}>
                      Lolos
                    </Chip>
                  ) : (
                    <Chip nada="bahaya" Ikon={X}>
                      Gugur
                    </Chip>
                  )}
                </td>
                <td className="min-w-[280px] px-3 py-3">
                  {p.alasan.length === 0 ? (
                    '—'
                  ) : (
                    <ul className="space-y-1">
                      {p.alasan.map((kode) => {
                        const isManual = kode.startsWith('DISKUALIFIKASI_MANUAL:');
                        const labelKode = isManual ? 'DISKUALIFIKASI_MANUAL' : kode;
                        const deskripsi = pesanAlasan(kode);
                        return (
                          <li key={kode}>
                            <span className="font-mono text-danger-700">{labelKode}</span>
                            <span className="block text-neutral-600">{deskripsi}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
                {periodeId && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    {p.eligible ? (
                      bisaUbah ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPesertaTerpilih(p);
                            setAlasanGugur('');
                            setGalat(null);
                          }}
                          className="inline-flex items-center rounded border border-danger-300 bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-700 hover:bg-danger-100"
                        >
                          Gugurkan
                        </button>
                      ) : (
                        <span
                          className="text-xs text-neutral-400"
                          title="Data tidak dapat diubah saat terkunci"
                        >
                          Terkunci
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pesertaTerpilih && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-neutral-0 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-neutral-900">Gugurkan Peserta</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Ubah status peserta berikut dari <strong>Lolos</strong> menjadi <strong>Gugur</strong>.
            </p>

            <div className="mt-4 rounded-md bg-neutral-50 p-3 text-xs text-neutral-700">
              <p>
                <span className="font-semibold">NOP:</span> {pesertaTerpilih.nopFormat}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Nama:</span> {pesertaTerpilih.nama || '—'}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Kecamatan:</span>{' '}
                {pesertaTerpilih.kecamatan || '—'}
              </p>
            </div>

            <label className="mt-4 block text-xs font-semibold text-neutral-700">
              Alasan diskualifikasi / gugur (minimal 3 karakter):
            </label>
            <textarea
              value={alasanGugur}
              onChange={(e) => {
                setAlasanGugur(e.target.value);
              }}
              rows={3}
              placeholder="Contoh: Bukan warga setempat atau objek pajak bermasalah"
              className="mt-1.5 w-full rounded-md border border-neutral-300 p-2.5 text-sm focus:border-primary-500 focus:outline-none"
            />

            {galat && <p className="mt-2 text-xs font-medium text-danger-600">{galat}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                varian="secondary"
                onClick={() => {
                  setPesertaTerpilih(null);
                }}
                disabled={memproses}
              >
                Batal
              </Button>
              <Button
                varian="danger"
                onClick={() => {
                  void jalankanGugur();
                }}
                disabled={alasanGugur.trim().length < 3 || memproses}
                memuat={memproses}
                labelMemuat="Menggugurkan..."
              >
                Gugurkan Peserta
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
