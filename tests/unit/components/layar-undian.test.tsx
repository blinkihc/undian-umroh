import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LayarUndian } from '@/components/undian/layar-undian';
import { type PaketTersimpan } from '@/client/offline/db';
import { type StateUndian } from '@/lib/draw/types';
import { TEMA_DEFAULT } from '@/lib/package/theme';

const mockPaket: PaketTersimpan = {
  periodeId: 'periode-test',
  dimuatAt: '2026-10-17T00:00:00Z',
  meta: {
    versiFormat: 1,
    aplikasiVersi: '1.0.0',
    dibuatAt: '2026-10-17T00:00:00Z',
    periode: {
      id: 'periode-test',
      slug: 'undian-2026',
      judul: 'Undian Umroh 2026',
      tanggalAcara: null,
      lokasiAcara: null,
    },
    wilayah: [
      { kode: 'W1', nama: 'Wilayah 1', jumlahPeserta: 1 },
      { kode: 'W2', nama: 'Wilayah 2', jumlahPeserta: 1 },
    ],
    slot: [
      { urutan: 1, kode: 'W1-UTAMA', wilayah: 'W1', label: 'Pemenang Utama' },
      { urutan: 2, kode: 'W2-UTAMA', wilayah: 'W2', label: 'Pemenang Utama' },
    ],
    snapshotHash: 'a'.repeat(64),
    temaConfigHash: 'b'.repeat(64),
  },
  snapshot: {
    versiFormat: 1,
    periodeId: 'periode-test',
    batasLunas: '2026-10-17',
    peserta: [
      {
        urut: 1,
        wilayah: 'W1',
        nama: 'Ahmad Dahlan',
        nopMasked: '16.09.010.xxx.xxx-0001.0',
        nikMasked: '1609xxxxxxxx0001',
        alamatWp: 'Jl. Merdeka',
        alamatOp: 'Jl. Merdeka',
        kecamatan: 'Muaradua',
        kelurahan: 'Bumi Agung',
        lunas: ['2022', '2023', '2024', '2025', '2026'],
      },
      {
        urut: 2,
        wilayah: 'W2',
        nama: 'Siti Hajar',
        nopMasked: '16.09.020.xxx.xxx-0002.0',
        nikMasked: '1609xxxxxxxx0002',
        alamatWp: 'Jl. Sudirman',
        alamatOp: 'Jl. Sudirman',
        kecamatan: 'Banding Agung',
        kelurahan: 'Bandar',
        lunas: ['2022', '2023', '2024', '2025', '2026'],
      },
    ],
  },
  tema: TEMA_DEFAULT,
};

let mockCurrentState: StateUndian;

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (param: string) => (param === 'periodeId' ? 'periode-test' : null),
  }),
}));

vi.mock('@/client/offline/db', () => ({
  bacaPaketDariDb: vi.fn(async () => mockPaket),
  bacaStateDariDb: vi.fn(async () => mockCurrentState),
  simpanPaketKeDb: vi.fn(async () => {}),
  simpanStateKeDb: vi.fn(async (st: StateUndian) => {
    mockCurrentState = st;
  }),
  resetStateUndianDb: vi.fn(async () => {}),
  ambilPerangkatId: vi.fn(async () => 'device-test-123'),
}));

vi.mock('@/client/offline/custom-audio-store', () => ({
  ambilAudioKustomFase: vi.fn(async () => null),
}));

vi.mock('@/client/offline/audio', () => ({
  PengelolaAudio: class {
    putarFase = vi.fn();
    hentikanSemua = vi.fn();
    setBisu = vi.fn();
  },
}));

describe('LayarUndian - Fitur Batal Putaran & Pemenang Slot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('menampilkan tombol Batal Putaran [.] saat fase MENGACAK dan membatalkan putaran saat diklik', async () => {
    mockCurrentState = {
      fase: 'MENGACAK',
      slotAktifIndex: 0,
      slotSelesai: [],
      dimulaiAt: '2026-10-17T10:00:00Z',
      selesaiAt: null,
      catatanLokal: [],
    };

    render(<LayarUndian />);

    const tombolBatal = await screen.findByRole('button', { name: /Batal Putaran \[\.\]/i });
    expect(tombolBatal).toBeInTheDocument();

    const tombolBerhenti = screen.getByRole('button', { name: /Berhenti \[Spasi\]/i });
    expect(tombolBerhenti).toBeInTheDocument();

    fireEvent.click(tombolBatal);

    // Setelah dibatalkan, tombol Mulai [Spasi] harus muncul kembali karena fase kembali ke MENUNGGU
    const tombolMulai = await screen.findByRole('button', { name: /Mulai \[Spasi\]/i });
    expect(tombolMulai).toBeInTheDocument();
  });

  it('dapat membatalkan putaran via pintasan keyboard Titik (.) saat fase MENGACAK', async () => {
    mockCurrentState = {
      fase: 'MENGACAK',
      slotAktifIndex: 0,
      slotSelesai: [],
      dimulaiAt: '2026-10-17T10:00:00Z',
      selesaiAt: null,
      catatanLokal: [],
    };

    render(<LayarUndian />);

    await screen.findByRole('button', { name: /Batal Putaran \[\.\]/i });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', code: 'Period', bubbles: true }));

    const tombolMulai = await screen.findByRole('button', { name: /Mulai \[Spasi\]/i });
    expect(tombolMulai).toBeInTheDocument();
  });

  it('menampilkan tombol Batal Pemenang Slot Ini [.] saat fase PEMENANG dan mengundi ulang setelah konfirmasi', async () => {
    mockCurrentState = {
      fase: 'PEMENANG',
      slotAktifIndex: 0,
      slotSelesai: [
        {
          kode: 'W1-UTAMA',
          urutan: 1,
          urut: 1,
          pemenang: mockPaket.snapshot.peserta[0]!,
          diundiAt: '2026-10-17T10:01:00Z',
        },
      ],
      dimulaiAt: '2026-10-17T10:00:00Z',
      selesaiAt: null,
      catatanLokal: [],
    };

    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<LayarUndian />);

    const tombolBatalSlot = await screen.findByRole('button', { name: /Batal Pemenang Slot Ini \[\.\]/i });
    expect(tombolBatalSlot).toBeInTheDocument();

    fireEvent.click(tombolBatalSlot);

    expect(confirmSpy).toHaveBeenCalledTimes(1);

    // Setelah dibatalkan, kembali ke MENUNGGU pada slot 1
    const tombolMulai = await screen.findByRole('button', { name: /Mulai \[Spasi\]/i });
    expect(tombolMulai).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('merender teks Zona 1 dan menghilangkan lencana slot serta info pool peserta', async () => {
    mockCurrentState = {
      fase: 'MENUNGGU',
      slotAktifIndex: 0,
      slotSelesai: [],
      dimulaiAt: null,
      selesaiAt: null,
      catatanLokal: [],
    };

    render(<LayarUndian />);

    const judulZona = await screen.findByRole('heading', { name: 'Zona 1' });
    expect(judulZona).toBeInTheDocument();

    expect(screen.queryByText(/Slot 1 dari/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pool Peserta Lolos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pemenang Utama/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Preset:/i)).not.toBeInTheDocument();
  });
});
