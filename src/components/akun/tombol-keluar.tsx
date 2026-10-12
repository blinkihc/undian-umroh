'use client';

import { type ReactElement, useState } from 'react';

import { Button } from '@/components/ui/button';

import { bukaHalaman, kirimLogout } from './auth-klien';

export function TombolKeluar(): ReactElement {
  const [memuat, setMemuat] = useState(false);
  const [gagal, setGagal] = useState(false);

  async function keluar(): Promise<void> {
    setMemuat(true);
    setGagal(false);
    if (await kirimLogout()) {
      bukaHalaman('/login');
      return;
    }
    setGagal(true);
    setMemuat(false);
  }

  return (
    <div className="flex items-center gap-2">
      {gagal && (
        <span role="alert" className="text-sm text-danger-700">
          Gagal keluar. Coba lagi.
        </span>
      )}
      <Button
        varian="secondary"
        memuat={memuat}
        labelMemuat="Keluar…"
        onClick={() => {
          void keluar();
        }}
      >
        Keluar
      </Button>
    </div>
  );
}
