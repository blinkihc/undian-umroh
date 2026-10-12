import { type Metadata } from 'next';
import Link from 'next/link';
import { type ReactElement } from 'react';

import { DaftarPeriode } from '@/components/periode/daftar-periode';
import { Alert } from '@/components/ui/alert';
import { NAMA_APLIKASI } from '@/config/brand';
import { wajibPeran } from '@/server/auth/halaman';
import { daftarPeriode } from '@/server/services/periode';

export const metadata: Metadata = { title: `Operator | ${NAMA_APLIKASI}` };

type OperatorPageProps = {
  searchParams: Promise<{ ditolak?: string }>;
};

export default async function OperatorPage({
  searchParams,
}: OperatorPageProps): Promise<ReactElement> {
  const pengguna = await wajibPeran(['ADMIN', 'OPERATOR']);
  const { ditolak } = await searchParams;
  const periode = await daftarPeriode();

  const periodeTerkunci = periode.find((p) => p.status === 'TERKUNCI');

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h1 className="font-heading text-h1 font-bold text-neutral-900">Dasbor Operator</h1>
          <p className="mt-2 text-base text-neutral-600">Selamat datang, {pengguna.nama}.</p>
        </div>
        {ditolak === '1' && (
          <Alert jenis="peringatan" judul="Anda tidak memiliki akses ke halaman ini." />
        )}
      </section>

      {/* Dua kartu besar Operator sesuai DESIGN_SYSTEM §11 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center size-12 rounded-lg bg-primary-100 text-primary-700 font-bold text-xl">
              🎲
            </div>
            <h2 className="font-heading text-xl font-bold text-neutral-900">
              Layar Undian Acara
            </h2>
            <p className="text-sm text-neutral-600">
              Jalankan undian offline 6 slot di laptop panggung acara. Dapat beroperasi penuh tanpa koneksi internet.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/operator/undian"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white shadow-xs hover:bg-primary-800"
            >
              Buka Layar Undian &rarr;
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center size-12 rounded-lg bg-secondary-100 text-secondary-800 font-bold text-xl">
              📤
            </div>
            <h2 className="font-heading text-xl font-bold text-neutral-900">
              Unggah Hasil Undian
            </h2>
            <p className="text-sm text-neutral-600">
              Kirimkan file hasil undian (.json) yang diunduh dari panggung untuk verifikasi 10 tahapan integritas.
            </p>
          </div>
          <div className="pt-6">
            {periodeTerkunci ? (
              <Link
                href={`/operator/periode/${periodeTerkunci.id}/unggah`}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-secondary-700 px-4 text-sm font-semibold text-white shadow-xs hover:bg-secondary-800"
              >
                Unggah Hasil ({periodeTerkunci.judul.slice(0, 24)}...) &rarr;
              </Link>
            ) : (
              <span className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-400 cursor-not-allowed">
                Tidak ada periode Terkunci
              </span>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="judul-periode-operator" className="space-y-4">
        <h2
          id="judul-periode-operator"
          className="font-heading text-h2 font-semibold text-neutral-900"
        >
          Daftar Periode Undian
        </h2>
        <DaftarPeriode items={periode} awalanDetail="/operator/periode" />
      </section>
    </div>
  );
}
