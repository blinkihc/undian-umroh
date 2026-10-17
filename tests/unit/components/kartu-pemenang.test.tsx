import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KartuPemenang } from '@/components/undian/kartu-pemenang';
import { type PesertaUndian } from '@/lib/draw/types';

describe('KartuPemenang', () => {
  const dummyPemenangW1: PesertaUndian = {
    urut: 1,
    nama: 'H. AHMAD DAHLAN',
    nopMasked: '16.09.010.xxx.xxx-0001.0',
    nikMasked: '1609************',
    wilayah: 'W1',
    kecamatan: 'MUARADUA',
    kelurahan: 'KISAM TINGGI',
    alamatWp: 'JL. MERDEKA NO. 1',
    alamatOp: 'JL. MERDEKA NO. 1',
    lunas: ['2022-05-10', '2023-06-11', '2024-07-12', '2025-08-13', '2026-09-14'],
  };

  const dummyPemenangW2: PesertaUndian = {
    ...dummyPemenangW1,
    nama: 'SITI AISYAH',
    wilayah: 'W2',
    kecamatan: 'BANDING AGUNG',
  };

  it('merender data pemenang Zona 1 dan timeline kepatuhan dengan tahun di atas dan tanggal di bawah', () => {
    render(
      <KartuPemenang
        slotKode="W1-UTAMA"
        slotLabel="Pemenang Utama"
        pemenang={dummyPemenangW1}
      />,
    );

    expect(screen.getByText('Pemenang Zona 1')).toBeInTheDocument();
    expect(screen.getByText('H. AHMAD DAHLAN')).toBeInTheDocument();
    expect(screen.getByText('16.09.010.xxx.xxx-0001.0')).toBeInTheDocument();
    expect(screen.getByText('MUARADUA')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('10/05/2022')).toBeInTheDocument();
    expect(screen.getByTestId('kartu-pemenang')).toBeInTheDocument();

    // Pastikan elemen yang dicoret merah tidak ada
    expect(screen.queryByText(/Buka Sensor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/STATUS: 100% LUNAS & VALID/i)).not.toBeInTheDocument();
    expect(screen.queryByText('LUNAS')).not.toBeInTheDocument();
  }, 15000);

  it('merender judul Pemenang Zona 2 saat slot kode atau wilayah adalah W2', () => {
    render(
      <KartuPemenang
        slotKode="W2-UTAMA"
        slotLabel="Pemenang Utama"
        pemenang={dummyPemenangW2}
      />,
    );

    expect(screen.getByText('Pemenang Zona 2')).toBeInTheDocument();
    expect(screen.getByText('SITI AISYAH')).toBeInTheDocument();
    expect(screen.getByText('BANDING AGUNG')).toBeInTheDocument();
  });
});
