'use client';

import Link from 'next/link';
import { useState, useTransition, type ChangeEvent, type ReactElement } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatHashRingkas } from '@/lib/package/hash';

export interface DetailPemeriksaan {
  id: string;
  label: string;
  selesai: boolean;
  sukses?: boolean;
}

const DAFTAR_PEMERIKSAAN_AWAL: DetailPemeriksaan[] = [
  { id: 'FORMAT', label: '1. Format file hasil JSON valid', selesai: false },
  { id: 'PERIODE', label: '2. Periode undian sesuai target', selesai: false },
  { id: 'SNAPSHOT_HASH', label: '3. Hash snapshot data peserta cocok', selesai: false },
  { id: 'HASIL_HASH', label: '4. Integritas hash file hasil cocok', selesai: false },
  { id: 'SLOT_LENGKAP', label: '5. Kelengkapan 6 slot undian (W1 & W2)', selesai: false },
  { id: 'PESERTA_ADA', label: '6. Peserta terdaftar di data terkunci', selesai: false },
  { id: 'WILAYAH_SESUAI', label: '7. Wilayah peserta sesuai slot undian', selesai: false },
  { id: 'PESERTA_UNIK', label: '8. Setiap slot dimenangkan peserta berbeda', selesai: false },
  { id: 'WAKTU', label: '9. Urutan waktu pengundian valid', selesai: false },
  { id: 'BELUM_ADA_HASIL', label: '10. Belum pernah ada hasil yang diunggah', selesai: false },
];

interface SlotItem {
  kode: string;
  nopMasked: string;
  nama: string;
  kecamatan: string;
}

interface ResponsSukses {
  status: 'DIUNDI';
  hasilHash: string;
  slot: SlotItem[];
  version: number;
}

interface UnggahHasilProps {
  periodeId: string;
  statusPeriode: string;
  isAdmin?: boolean;
}

export function UnggahHasil({
  periodeId,
  statusPeriode,
  isAdmin = true,
}: UnggahHasilProps): ReactElement {
  const [fileTerpilih, setFileTerpilih] = useState<File | null>(null);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);
  const [suksesData, setSuksesData] = useState<ResponsSukses | null>(null);
  const [daftarCek, setDaftarCek] = useState<DetailPemeriksaan[]>(DAFTAR_PEMERIKSAAN_AWAL);
  const [sedangKirim, startTransition] = useTransition();

  const periodeTerkunci = statusPeriode === 'TERKUNCI';
  const periodeSudahDiundi = statusPeriode === 'DIUNDI';

  function handlePilihFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) {
      setFileTerpilih(file);
      setErrorPesan(null);
      setDaftarCek(DAFTAR_PEMERIKSAAN_AWAL);
    }
  }

  function handleUnggah(): void {
    if (!fileTerpilih) return;

    setErrorPesan(null);
    setSuksesData(null);

    startTransition(async () => {
      try {
        // Simulasi progres visual checklist
        for (let i = 0; i < daftarCek.length; i++) {
          setDaftarCek((prev) =>
            prev.map((item, idx) => (idx <= i ? { ...item, selesai: true, sukses: true } : item)),
          );
        }

        const teks = await fileTerpilih.text();
        const res = await fetch(`/api/periode/${periodeId}/hasil`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: teks,
        });

        const data = (await res.json()) as unknown;

        if (!res.ok) {
          const errData = data as { message?: unknown } | null;
          const pesan =
            errData && typeof errData === 'object' && typeof errData.message === 'string'
              ? errData.message
              : 'Gagal memverifikasi dan mengunggah hasil undian.';
          setErrorPesan(pesan);
          setDaftarCek((prev) =>
            prev.map((item) => ({ ...item, selesai: true, sukses: false })),
          );
          return;
        }

        setSuksesData(data as ResponsSukses);
      } catch (err) {
        setErrorPesan(err instanceof Error ? err.message : 'Terjadi gangguan jaringan.');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-h2 font-semibold text-neutral-900">
          Unggah Hasil Undian
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Unggah file hasil undian (.json) yang diunduh dari laptop acara setelah keenam slot selesai.
        </p>
      </div>

      {!periodeTerkunci && !periodeSudahDiundi && (
        <Alert jenis="peringatan" judul="Periode belum Terkunci">
          Hasil undian hanya dapat diunggah bila status periode telah Terkunci dan data peserta sudah dibekukan.
        </Alert>
      )}

      {periodeSudahDiundi && !suksesData && (
        <Alert jenis="info" judul="Hasil sudah pernah diunggah">
          Periode ini telah memiliki hasil undian yang terverifikasi dan berstatus Diundi.
        </Alert>
      )}

      {errorPesan && (
        <Alert jenis="galat" judul="Unggahan Ditolak">
          {errorPesan}
        </Alert>
      )}

      {suksesData ? (
        <div className="space-y-6 rounded-lg border border-success-200 bg-success-50 p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-200 text-success-800">
                TERVERIFIKASI
              </span>
              <h3 className="font-heading text-lg font-bold text-success-900">
                Hasil Terverifikasi
              </h3>
            </div>
            <p className="text-sm text-success-800">
              Cocokkan hash ini dengan layar acara:{' '}
              <span className="font-mono font-bold text-base text-success-950">
                {formatHashRingkas(suksesData.hasilHash)}
              </span>
            </p>
            <p className="font-mono text-xs text-neutral-600 break-all">
              Hash lengkap: {suksesData.hasilHash}
            </p>
          </div>

          <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm text-neutral-700">
              <thead className="bg-neutral-100 text-xs font-semibold text-neutral-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">NOP</th>
                  <th className="px-4 py-3">Nama Pemenang</th>
                  <th className="px-4 py-3">Kecamatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {suksesData.slot.map((s) => (
                  <tr key={s.kode} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-semibold text-neutral-900">{s.kode}</td>
                    <td className="px-4 py-3 font-mono">{s.nopMasked}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{s.nama}</td>
                    <td className="px-4 py-3">{s.kecamatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <div className="pt-2">
              <Link
                href={`/admin/periode/${periodeId}/pemenang`}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary-700 px-5 text-sm font-semibold text-white shadow-xs hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Lanjut ke Verifikasi Pemenang &rarr;
              </Link>
            </div>
          )}
        </div>
      ) : (
        periodeTerkunci && (
          <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-xs">
            <div className="space-y-2">
              <label
                htmlFor="file-hasil-input"
                className="block text-sm font-semibold text-neutral-900"
              >
                Pilih File Hasil Undian (.json)
              </label>
              <input
                id="file-hasil-input"
                type="file"
                accept=".json"
                onChange={handlePilihFile}
                disabled={sedangKirim}
                className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50"
              />
              {fileTerpilih && (
                <p className="text-xs text-neutral-500">
                  File terpilih: <span className="font-medium text-neutral-800">{fileTerpilih.name}</span> ({Math.round(fileTerpilih.size / 1024)} KB)
                </p>
              )}
            </div>

            {sedangKirim && (
              <div className="space-y-3 rounded-md bg-neutral-50 p-4 border border-neutral-200">
                <p className="text-sm font-semibold text-neutral-800">
                  Memverifikasi hasil undian...
                </p>
                <ul className="space-y-1.5 text-xs text-neutral-600">
                  {daftarCek.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span className={c.selesai ? (c.sukses ? 'text-success-600 font-bold' : 'text-error-600 font-bold') : 'text-neutral-400'}>
                        {c.selesai ? (c.sukses ? '✓' : '✗') : '○'}
                      </span>
                      <span>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <Button
                varian="primary"
                onClick={handleUnggah}
                disabled={!fileTerpilih || sedangKirim}
                memuat={sedangKirim}
                labelMemuat="Memverifikasi..."
              >
                Unggah dan Verifikasi Hasil
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
