import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TabelPeserta, type PesertaTampil } from '@/components/admin/peserta/tabel-peserta';
import { Paginasi, susunQuery } from '@/components/ui/paginasi';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const DASAR: PesertaTampil = {
  id: 'a',
  baris: 2,
  nopFormat: '16.09.990.000.000-0000.1',
  nikMasked: '1609xxxxxxxx0001',
  nama: 'WAJIB PAJAK SATU',
  kecamatan: 'MUARADUA',
  kelurahan: '',
  lunas: {
    2022: '2022-06-10T09:00:00+07:00',
    2023: null,
    2024: null,
    2025: '2026-04-13T10:00:00+07:00',
    2026: '2026-08-11T13:00:00+07:00',
  },
  lunasRaw: { 2022: '10/06/2022 09:00:00', 2023: '', 2024: '31/02/2024', 2025: '', 2026: '' },
  eligible: false,
  alasan: ['TANGGAL_KOSONG_2023', 'TANGGAL_TIDAK_DIKENALI_2024'],
};

describe('TabelPeserta', () => {
  it('menampilkan NOP bertitik, NIK tersamar, tanggal WIB atau nilai asli, status, dan alasan', () => {
    render(
      <TabelPeserta baris={[DASAR, { ...DASAR, id: 'b', baris: 3, eligible: true, alasan: [] }]} />,
    );

    const [, gugur, lolos] = screen.getAllByRole('row');
    expect(gugur).toHaveTextContent('16.09.990.000.000-0000.1');
    expect(gugur).toHaveTextContent('1609xxxxxxxx0001');
    expect(gugur).toHaveTextContent('10/06/2022 09:00:00');
    expect(gugur).toHaveTextContent('31/02/2024');
    expect(gugur).toHaveTextContent('13/04/2026 10:00:00');
    expect(gugur).toHaveTextContent('Gugur');
    expect(gugur).toHaveTextContent('TANGGAL_KOSONG_2023Tanggal lunas tahun 2023 kosong.');
    expect(gugur).toHaveTextContent('Format tanggal lunas tahun 2024 tidak dikenali.');
    expect(lolos).toHaveTextContent('Lolos');
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toContain('Lunas 2026');
  });

  it('menampilkan tombol Gugurkan saat periodeId dan bisaUbah aktif, serta membuka modal konfirmasi', () => {
    render(
      <TabelPeserta
        baris={[
          { ...DASAR, id: 'b', baris: 3, eligible: true, alasan: [] },
          { ...DASAR, id: 'c', baris: 4, eligible: false, alasan: ['NOP_INVALID'] },
        ]}
        periodeId="p1"
        bisaUbah={true}
      />,
    );

    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toContain('Aksi');
    const tombolGugur = screen.getByRole('button', { name: 'Gugurkan' });
    expect(tombolGugur).toBeInTheDocument();

    fireEvent.click(tombolGugur);
    expect(screen.getByRole('heading', { name: 'Gugurkan Peserta' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Bukan warga setempat/i)).toBeInTheDocument();
  });
});

describe('Paginasi', () => {
  it('menyusun tautan dengan filter terisi saja dan menyebut total', () => {
    render(
      <Paginasi
        label="Halaman uji"
        page={2}
        pageSize={50}
        total={120}
        satuan="peserta"
        jalur="/admin/periode/p1/peserta"
        query={{ status: 'gugur', q: undefined, kecamatan: '' }}
      />,
    );

    expect(screen.getByText('Halaman 2 dari 3 · 120 peserta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sebelumnya' })).toHaveAttribute(
      'href',
      '/admin/periode/p1/peserta?status=gugur',
    );
    expect(screen.getByRole('link', { name: 'Berikutnya' })).toHaveAttribute(
      'href',
      '/admin/periode/p1/peserta?status=gugur&page=3',
    );
    expect(susunQuery({})).toBe('');
  });
});
