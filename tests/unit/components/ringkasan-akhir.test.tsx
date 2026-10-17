import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RingkasanAkhir } from '@/components/undian/ringkasan-akhir';
import { type StateUndian } from '@/lib/draw/types';

describe('RingkasanAkhir', () => {
  const dummyState: StateUndian = {
    fase: 'SELESAI',
    slotAktifIndex: 2,
    slotSelesai: [
      {
        kode: 'W1-UTAMA',
        urutan: 1,
        urut: 1,
        pemenang: {
          urut: 1,
          wilayah: 'W1',
          nopMasked: '16.09.010.xxx.xxx-0001.0',
          nikMasked: '1609xxxxxxxx0001',
          nama: 'Budi Santoso',
          alamatWp: 'Jl. Merdeka No. 1',
          alamatOp: 'Jl. Merdeka No. 1',
          kecamatan: 'Muaradua',
          kelurahan: 'Pasar',
          lunas: ['2022', '2023', '2024', '2025', '2026'],
        },
        diundiAt: '2026-10-15T00:00:00Z',
      },
      {
        kode: 'W2-UTAMA',
        urutan: 2,
        urut: 2,
        pemenang: {
          urut: 2,
          wilayah: 'W2',
          nopMasked: '16.09.020.xxx.xxx-0002.0',
          nikMasked: '1609xxxxxxxx0002',
          nama: 'Siti Aminah',
          alamatWp: 'Jl. Sudirman No. 2',
          alamatOp: 'Jl. Sudirman No. 2',
          kecamatan: 'Banding',
          kelurahan: 'Sukamaju',
          lunas: ['2022', '2023', '2024', '2025', '2026'],
        },
        diundiAt: '2026-10-15T00:01:00Z',
      },
    ],
    dimulaiAt: '2026-10-15T00:00:00Z',
    selesaiAt: '2026-10-15T00:02:00Z',
    catatanLokal: [],
  };

  it('menampilkan tombol Unduh File Hasil dan Ulangi Pengundian', () => {
    const handleUnduh = vi.fn();
    const handleReset = vi.fn();

    render(
      <RingkasanAkhir
        periodeJudul="Undian Umroh 2026"
        periodeSlug="undian-umroh-2026"
        state={dummyState}
        fileHasil={null}
        onUnduhHasil={handleUnduh}
        onResetUndian={handleReset}
      />,
    );

    const tombolUnduh = screen.getByRole('button', { name: /Unduh File Hasil Undian/i });
    expect(tombolUnduh).toBeInTheDocument();
    fireEvent.click(tombolUnduh);
    expect(handleUnduh).toHaveBeenCalledTimes(1);

    const tombolReset = screen.getByRole('button', { name: /Ulangi Pengundian/i });
    expect(tombolReset).toBeInTheDocument();
    fireEvent.click(tombolReset);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
