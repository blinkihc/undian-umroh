import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BatalPeriode } from '@/components/admin/periode/batal-periode';
import { FormPeriode, type PeriodeUntukForm } from '@/components/admin/periode/form-periode';
import { DaftarPeriode } from '@/components/periode/daftar-periode';

const fetchMock = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const PERIODE: PeriodeUntukForm = {
  id: 'p1',
  version: 3,
  status: 'DRAF',
  judul: 'Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026',
  batasLunas: '2026-09-30T23:59:59+07:00',
  tanggalAcara: null,
  lokasiAcara: null,
  wilayah: [
    { kode: 'W1', nama: 'Wilayah 1' },
    { kode: 'W2', nama: 'Wilayah 2' },
  ],
};

function respons(isi: unknown, status = 200): Response {
  return new Response(JSON.stringify(isi), { status });
}

function isiTerkirim(): unknown {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  fetchMock.mockReset();
  push.mockReset();
  refresh.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FormPeriode mode buat', () => {
  it('terisi nilai bawaan dan mengirim batas akhir hari WIB, lalu membuka halaman periode', async () => {
    fetchMock.mockResolvedValue(respons({ id: 'baru1' }, 201));
    render(<FormPeriode mode="buat" />);

    expect(screen.getByLabelText('Judul')).toHaveValue(PERIODE.judul);
    expect(screen.getByLabelText('Tahun pajak')).toBeDisabled();
    expect(screen.getByLabelText('Tanggal batas lunas')).toHaveValue('2026-09-30');
    await userEvent.type(screen.getByLabelText('Lokasi acara (opsional)'), 'Aula Bapenda');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin/periode/baru1/peserta');
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/periode');
    expect(isiTerkirim()).toEqual({
      judul: PERIODE.judul,
      batasLunas: '2026-09-30T23:59:59+07:00',
      tanggalAcara: null,
      lokasiAcara: 'Aula Bapenda',
      namaWilayah: { W1: 'Wilayah 1', W2: 'Wilayah 2' },
    });
  });

  it('menolak judul pendek dan nama wilayah kosong di klien', async () => {
    render(<FormPeriode mode="buat" />);

    await userEvent.clear(screen.getByLabelText('Judul'));
    await userEvent.type(screen.getByLabelText('Judul'), 'abc');
    await userEvent.clear(screen.getByLabelText('Nama Wilayah 2'));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(screen.getByLabelText('Judul')).toHaveAccessibleDescription('Judul minimal 5 karakter.');
    expect(screen.getByLabelText('Nama Wilayah 2')).toHaveAccessibleDescription(
      'Nama wilayah wajib diisi.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menampilkan pesan server bila masih ada periode aktif', async () => {
    fetchMock.mockResolvedValue(
      respons(
        {
          error: {
            code: 'PERIODE_AKTIF_SUDAH_ADA',
            message:
              'Masih ada periode aktif: Lama. Publikasikan atau batalkan periode tersebut dulu.',
          },
        },
        409,
      ),
    );
    render(<FormPeriode mode="buat" />);

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Masih ada periode aktif: Lama.');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('FormPeriode mode ubah', () => {
  it('hanya mengirim field yang berubah beserta version', async () => {
    fetchMock.mockResolvedValue(respons({ id: 'p1' }));
    const { rerender } = render(<FormPeriode mode="ubah" periode={PERIODE} />);

    await userEvent.clear(screen.getByLabelText('Nama Wilayah 1'));
    await userEvent.type(screen.getByLabelText('Nama Wilayah 1'), 'Wilayah Barat');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Perubahan periode disimpan.')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/periode/p1');
    expect(isiTerkirim()).toEqual({ version: 3, namaWilayah: { W1: 'Wilayah Barat' } });
    expect(refresh).toHaveBeenCalled();

    // Data hasil muat ulang (version baru) mengisi ulang isian tanpa menghapus pesan sukses.
    rerender(
      <FormPeriode
        mode="ubah"
        periode={{ ...PERIODE, version: 4, lokasiAcara: 'Diubah di tempat lain' }}
      />,
    );
    expect(screen.getByText('Perubahan periode disimpan.')).toBeInTheDocument();
    expect(screen.getByLabelText('Lokasi acara (opsional)')).toHaveValue('Diubah di tempat lain');
  });

  it('tanpa perubahan tidak memanggil API', async () => {
    render(<FormPeriode mode="ubah" periode={PERIODE} />);

    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(screen.getByText('Tidak ada perubahan untuk disimpan.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tanggal batas nonaktif dengan alasan setelah Terkunci', () => {
    render(<FormPeriode mode="ubah" periode={{ ...PERIODE, status: 'TERKUNCI' }} />);

    const batas = screen.getByLabelText('Tanggal batas lunas');
    expect(batas).toBeDisabled();
    expect(batas).toHaveAccessibleDescription(
      'Tanggal batas hanya dapat diubah saat periode berstatus Draf.',
    );
  });

  it('versi basi: pesan server tampil dan data dimuat ulang', async () => {
    fetchMock.mockResolvedValue(
      respons(
        { error: { code: 'CONFLICT', message: 'Periode ini baru saja diubah orang lain.' } },
        409,
      ),
    );
    render(<FormPeriode mode="ubah" periode={PERIODE} />);

    await userEvent.type(screen.getByLabelText('Lokasi acara (opsional)'), 'Aula');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('baru saja diubah orang lain');
    expect(refresh).toHaveBeenCalled();
  });
});

describe('BatalPeriode', () => {
  it('meminta konfirmasi dan alasan minimal 10 karakter sebelum mengirim', async () => {
    fetchMock.mockResolvedValue(respons({ id: 'p1', status: 'DIBATALKAN' }));
    render(<BatalPeriode id="p1" version={3} />);

    await userEvent.click(screen.getByRole('button', { name: 'Batalkan Periode' }));
    await userEvent.type(screen.getByLabelText(/^Alasan pembatalan/), 'pendek');
    await userEvent.click(screen.getByRole('button', { name: 'Ya, batalkan periode' }));
    expect(screen.getByLabelText(/^Alasan pembatalan/)).toHaveAccessibleDescription(
      'Alasan pembatalan minimal 10 karakter.',
    );
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/^Alasan pembatalan/), ' karena data salah');
    await userEvent.click(screen.getByRole('button', { name: 'Ya, batalkan periode' }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/periode/p1/batal');
    expect(isiTerkirim()).toEqual({ version: 3, alasan: 'pendek karena data salah' });
  });
});

describe('DaftarPeriode', () => {
  it('keadaan kosong menampilkan pesan dan tombol Buat Periode bila diizinkan', () => {
    const { rerender } = render(
      <DaftarPeriode items={[]} awalanDetail="/admin/periode" hrefBuat="/admin/periode/baru" />,
    );

    expect(screen.getByText('Belum ada periode undian.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buat Periode' })).toHaveAttribute(
      'href',
      '/admin/periode/baru',
    );

    rerender(<DaftarPeriode items={[]} awalanDetail="/operator/periode" />);
    expect(screen.queryByRole('link', { name: 'Buat Periode' })).toBeNull();
  });

  it('menampilkan baris periode dengan chip status dan tanggal WIB', () => {
    render(
      <DaftarPeriode
        awalanDetail="/admin/periode"
        items={[
          { ...PERIODE, tanggalAcara: '2026-10-20', lokasiAcara: 'Aula Bapenda' },
          { ...PERIODE, id: 'p0', status: 'DIBATALKAN', judul: 'Periode Lama' },
        ]}
      />,
    );

    const baris = screen.getAllByRole('row');
    expect(baris[1]).toHaveTextContent('Draf');
    expect(baris[1]).toHaveTextContent('30/09/2026 23:59:59 WIB');
    expect(baris[1]).toHaveTextContent('20/10/2026');
    expect(baris[1]).toHaveTextContent('Aula Bapenda');
    expect(baris[2]).toHaveTextContent('Dibatalkan');
    expect(baris[2]).toHaveTextContent('Belum ditentukan');
    expect(screen.getByRole('link', { name: 'Periode Lama' })).toHaveAttribute(
      'href',
      '/admin/periode/p0',
    );
  });
});
