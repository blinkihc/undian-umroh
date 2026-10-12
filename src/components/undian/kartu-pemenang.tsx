import { Award, CheckCircle, MapPin, User } from 'lucide-react';
import { type ReactElement } from 'react';

import { type PesertaUndian } from '@/lib/draw/types';
import { type KodeSlotPaket } from '@/lib/package/kontrak';

type KartuPemenangProps = {
  slotKode: KodeSlotPaket;
  slotLabel: string;
  pemenang: PesertaUndian;
};

export function KartuPemenang({
  slotKode,
  slotLabel,
  pemenang,
}: KartuPemenangProps): ReactElement {
  return (
    <div
      data-testid="kartu-pemenang"
      className="w-full max-w-2xl rounded-2xl border-2 border-primary-500 bg-neutral-0 p-8 shadow-2xl transition-all"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-800">
            <Award className="size-6" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-widest text-primary-700 uppercase">
              {slotKode}
            </span>
            <h2 className="text-xl font-bold text-neutral-900">{slotLabel}</h2>
          </div>
        </div>
        <div className="rounded-full bg-success-100 px-3 py-1 text-xs font-semibold text-success-800">
          Terpilih
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <span className="text-xs font-semibold text-neutral-500 uppercase">Nama Wajib Pajak</span>
          <p className="flex items-center gap-2 text-2xl font-black text-neutral-900">
            <User className="size-5 text-neutral-400" />
            {pemenang.nama}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-neutral-50 p-3">
            <span className="text-xs font-semibold text-neutral-500 uppercase">NOP (Tersamar)</span>
            <p className="mt-0.5 font-mono text-base font-bold text-neutral-900">
              {pemenang.nopMasked}
            </p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <span className="text-xs font-semibold text-neutral-500 uppercase">NIK (Tersamar)</span>
            <p className="mt-0.5 font-mono text-base font-bold text-neutral-900">
              {pemenang.nikMasked}
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-neutral-200 p-4">
          <div className="flex items-start gap-2 text-sm text-neutral-700">
            <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-400" />
            <div>
              <p>
                <strong>Kecamatan:</strong> {pemenang.kecamatan} | <strong>Kelurahan:</strong>{' '}
                {pemenang.kelurahan || '-'}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                <strong>Alamat WP:</strong> {pemenang.alamatWp || '-'}
              </p>
              <p className="text-xs text-neutral-600">
                <strong>Alamat OP:</strong> {pemenang.alamatOp || '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <span className="text-xs font-semibold text-neutral-600 uppercase">
            Bukti Lunas 5 Tahun Berturut-turut (2022–2026)
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {['2022', '2023', '2024', '2025', '2026'].map((tahun, idx) => (
              <div key={tahun} className="flex items-center gap-1.5 text-neutral-700">
                <CheckCircle className="size-3.5 text-success-600" />
                <span>
                  <strong>{tahun}:</strong> {pemenang.lunas[idx] ?? 'Lunas'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
