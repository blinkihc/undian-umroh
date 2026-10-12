'use client';

import { type ReactElement } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type GalatPesertaProps = { reset: () => void };

/** Keadaan galat tab Data Peserta (DESIGN_SYSTEM §12 Error): penjelasan + langkah berikutnya. */
export default function GalatPeserta({ reset }: GalatPesertaProps): ReactElement {
  return (
    <div className="space-y-4">
      <Alert jenis="galat" judul="Data peserta gagal dimuat.">
        Periksa koneksi lalu coba lagi. Jika berulang, hubungi admin sistem.
      </Alert>
      <Button varian="secondary" onClick={reset}>
        Coba lagi
      </Button>
    </div>
  );
}
