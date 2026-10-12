import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RingkasanPeserta } from '@/components/admin/peserta/ringkasan-peserta';
import { UnggahImpor } from '@/components/admin/peserta/unggah-impor';

const refresh = vi.fn();
const unggahForm = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock('@/client/unggah', () => ({
  unggahForm: (...args: unknown[]): unknown => unggahForm(...args),
}));

const LABEL_FILE = /^File ekspor PBB/;

function fileCsv(): File {
  return new File(['NOP;...'], 'ekspor.csv', { type: 'text/csv' });
}

beforeEach(() => {
  refresh.mockReset();
  unggahForm.mockReset();
});

describe('UnggahImpor', () => {
  it('tanpa file: pesan di bawah field, API tidak dipanggil', async () => {
    render(<UnggahImpor periodeId="p1" version={1} adaData={false} />);

    await userEvent.click(screen.getByRole('button', { name: 'Unggah File' }));

    expect(screen.getByLabelText(LABEL_FILE)).toHaveAccessibleDescription(
      'Pilih file .csv atau .xlsx.',
    );
    expect(unggahForm).not.toHaveBeenCalled();
  });

  it('mengirim file dan version, lalu menampilkan ringkasan hasil', async () => {
    unggahForm.mockImplementation(
      (_url: string, _form: FormData, kemajuan: (b: number) => void) => {
        kemajuan(1);
        return Promise.resolve({
          ok: true,
          data: { totalBaris: 45812, jumlahLolos: 41230, jumlahGugur: 4582 },
        });
      },
    );
    render(<UnggahImpor periodeId="p1" version={3} adaData={false} />);

    await userEvent.upload(screen.getByLabelText(LABEL_FILE), fileCsv());
    await userEvent.click(screen.getByRole('button', { name: 'Unggah File' }));

    expect(
      await screen.findByText('Impor selesai: 45.812 baris, 41.230 lolos, 4.582 gugur.'),
    ).toBeInTheDocument();
    const [url, form] = unggahForm.mock.calls[0] as [string, FormData];
    expect(url).toBe('/api/periode/p1/impor');
    expect(form.get('version')).toBe('3');
    expect((form.get('file') as File).name).toBe('ekspor.csv');
    expect(refresh).toHaveBeenCalled();
  });

  it('impor ulang meminta konfirmasi lebih dulu', async () => {
    unggahForm.mockResolvedValue({
      ok: true,
      data: { totalBaris: 1, jumlahLolos: 1, jumlahGugur: 0 },
    });
    render(<UnggahImpor periodeId="p1" version={2} adaData />);

    await userEvent.upload(screen.getByLabelText(LABEL_FILE), fileCsv());
    await userEvent.click(screen.getByRole('button', { name: 'Unggah File' }));
    expect(
      screen.getByText('Impor ulang akan mengganti seluruh data peserta periode ini. Lanjutkan?'),
    ).toBeInTheDocument();
    expect(unggahForm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Ya, impor ulang' }));
    await waitFor(() => {
      expect(unggahForm).toHaveBeenCalledTimes(1);
    });
  });

  it('penolakan server tampil sebagai banner galat dengan pesan kolom', async () => {
    unggahForm.mockResolvedValue({
      ok: false,
      status: 400,
      code: 'HEADER_TIDAK_SESUAI',
      message: 'Header file tidak sesuai. Kolom hilang: Tanggal Lunas 2024.',
      fields: {},
      details: {},
    });
    render(<UnggahImpor periodeId="p1" version={1} adaData={false} />);

    await userEvent.upload(screen.getByLabelText(LABEL_FILE), fileCsv());
    await userEvent.click(screen.getByRole('button', { name: 'Unggah File' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Impor ditolak.');
    expect(banner).toHaveTextContent('Kolom hilang: Tanggal Lunas 2024.');
  });
});

describe('RingkasanPeserta', () => {
  it('menampilkan kartu, banner kecamatan belum terpetakan, dan gugur per alasan', () => {
    render(
      <RingkasanPeserta
        namaWilayah={{ W1: 'Wilayah Barat', W2: 'Wilayah Timur' }}
        ringkasan={{
          namaFile: 'ekspor.csv',
          diimporAt: '2026-10-12T14:05:03+07:00',
          totalBaris: 45812,
          jumlahLolos: 41230,
          jumlahGugur: 4582,
          lolosPerWilayah: { W1: 0, W2: 0, BELUM_DIPETAKAN: 41230 },
          gugurPerAlasan: { NOP_DUPLICATE: 12, TANGGAL_KOSONG_2024: 2100 },
          nikTidakValid: 37,
          nopGanda: 6,
          kecamatanBelumDipetakan: ['BUAY RUNJUNG', 'MUARADUA'],
        }}
      />,
    );

    const kartu = screen.getByRole('region', { name: 'Ringkasan data peserta' });
    expect(kartu).toHaveTextContent('Total baris45.812');
    expect(kartu).toHaveTextContent('Wilayah Barat 0 · Wilayah Timur 0 · Belum dipetakan 41.230');
    expect(kartu).toHaveTextContent('Peringatan NIK37');
    expect(screen.getByText('2 kecamatan belum dipetakan ke wilayah.')).toBeInTheDocument();
    const baris = screen.getAllByRole('row');
    expect(baris[1]).toHaveTextContent(
      'NOP_DUPLICATENOP muncul lebih dari satu kali dalam file.12',
    );
    expect(baris[2]).toHaveTextContent('TANGGAL_KOSONG_2024Tanggal lunas tahun 2024 kosong.2.100');
    expect(screen.getByText('12/10/2026 14:05:03 WIB')).toBeInTheDocument();
  });
});
