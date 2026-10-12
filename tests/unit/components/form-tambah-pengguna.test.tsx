import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormTambahPengguna } from '@/components/admin/pengguna/form-tambah-pengguna';

const fetchMock = vi.fn();
const onBerhasil = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  onBerhasil.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function isi(nilai: { nama: string; username: string; password: string }): Promise<void> {
  if (nilai.nama) await userEvent.type(screen.getByLabelText('Nama'), nilai.nama);
  if (nilai.username) await userEvent.type(screen.getByLabelText('Username'), nilai.username);
  if (nilai.password) {
    await userEvent.type(screen.getByLabelText(/^Kata sandi awal/), nilai.password);
  }
  await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
}

describe('FormTambahPengguna', () => {
  it('menolak isian tidak valid di klien tanpa memanggil API', async () => {
    render(<FormTambahPengguna onBerhasil={onBerhasil} onBatal={vi.fn()} />);

    await isi({ nama: '', username: 'Ab', password: 'pendek' });

    expect(screen.getByLabelText('Nama')).toHaveAccessibleDescription('Nama wajib diisi.');
    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
      'Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau strip.',
    );
    expect(screen.getByLabelText(/^Kata sandi awal/)).toHaveAccessibleDescription(
      'Kata sandi awal minimal 12 karakter.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mengirim data yang dirapikan dan memberi tahu pemanggil saat berhasil', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ username: 'operator.dua' }), { status: 201 }),
    );
    render(<FormTambahPengguna onBerhasil={onBerhasil} onBatal={vi.fn()} />);

    await isi({ nama: 'Operator Dua', username: 'Operator.Dua', password: 'kata-sandi-awal-1' });

    await waitFor(() => {
      expect(onBerhasil).toHaveBeenCalledWith('operator.dua');
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/pengguna');
    expect(JSON.parse(init.body as string)).toEqual({
      nama: 'Operator Dua',
      username: 'operator.dua',
      peran: 'OPERATOR',
      passwordAwal: 'kata-sandi-awal-1',
    });
  });

  it('menampilkan galat field dari server, mis. username sudah dipakai', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'USERNAME_SUDAH_DIPAKAI',
            message: 'Username sudah dipakai.',
            details: { fields: { username: 'Username sudah dipakai. Pilih username lain.' } },
          },
        }),
        { status: 409 },
      ),
    );
    render(<FormTambahPengguna onBerhasil={onBerhasil} onBatal={vi.fn()} />);

    await isi({ nama: 'Ganda', username: 'operator.satu', password: 'kata-sandi-awal-1' });

    expect(await screen.findByLabelText('Username')).toHaveAccessibleDescription(
      'Username sudah dipakai. Pilih username lain.',
    );
    expect(onBerhasil).not.toHaveBeenCalled();
  });
});
