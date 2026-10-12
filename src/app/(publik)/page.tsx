import { Info } from 'lucide-react';
import type { ReactElement } from 'react';

import { JUDUL_ACARA_DEFAULT } from '@/config/brand';

export default function BerandaPage(): ReactElement {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 md:py-12">
      <div className="max-w-[720px]">
        <p className="text-sm font-semibold text-primary-700">Bapenda Kabupaten OKU Selatan</p>
        <h1 className="mt-2 font-heading text-h1-mobile font-bold text-neutral-900 md:text-h1">
          {JUDUL_ACARA_DEFAULT}
        </h1>
        <p className="mt-4 text-base text-neutral-600">
          Undian umroh untuk wajib pajak PBB-P2 yang melunasi pajaknya dari tahun 2022 sampai 2026.
          Dua paket umroh diundi secara terbuka, satu untuk setiap wilayah.
        </p>
      </div>

      <div
        role="status"
        className="mt-8 flex max-w-[720px] items-start gap-3 rounded-md border border-primary-700 bg-primary-100 p-4"
      >
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-700" />
        <div>
          <p className="text-base font-semibold text-neutral-900">Halaman ini sedang disiapkan</p>
          <p className="mt-1 text-sm text-neutral-600">
            Pengumuman pemenang dan fitur cek NOP akan tersedia di sini setelah data peserta
            ditetapkan.
          </p>
        </div>
      </div>
    </section>
  );
}
