import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('animejs', () => ({
  animate: vi.fn(),
  createTimeline: vi.fn(),
  stagger: vi.fn(() => 0),
}));

import { AnimasiProsesImpor } from '@/components/admin/peserta/animasi-proses-impor';

describe('AnimasiProsesImpor', () => {
  it('merender tahapan latar belakang saat proses mengunggah', () => {
    render(<AnimasiProsesImpor tahap="mengunggah" kemajuan={0.5} />);

    expect(screen.getByText('Mengunggah Berkas ke Server...')).toBeInTheDocument();
    expect(screen.getByText(/1\. Pemindaian & Pembacaan Struktur Berkas/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Validasi NOP & Evaluasi 5 Tahun/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Enkripsi Kriptografis NIK/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Sinkronisasi Database & Pemetaan Wilayah/)).toBeInTheDocument();
  });

  it('merender tahapan latar belakang saat proses memproses di server', () => {
    render(<AnimasiProsesImpor tahap="memproses" kemajuan={1} />);

    expect(
      screen.getByText('Memproses Validasi & Enkripsi Data Peserta'),
    ).toBeInTheDocument();
    expect(screen.getByText(/LATAR BELAKANG AKTIF/)).toBeInTheDocument();
  });
});
