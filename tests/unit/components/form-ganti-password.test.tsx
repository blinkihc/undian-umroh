import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { bukaHalaman } = vi.hoisted(() => ({ bukaHalaman: vi.fn() }));

vi.mock('@/components/akun/auth-klien', () => ({ bukaHalaman }));

import { FormGantiPassword } from '@/components/akun/form-ganti-password';

const fetchMock = vi.fn();

beforeEach(() => {
  bukaHalaman.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function isi(lama: string, baru: string, ulangi: string): Promise<void> {
  await userEvent.type(screen.getByLabelText('Kata sandi lama'), lama);
  await userEvent.type(screen.getByLabelText(/^Kata sandi baru/), baru);
  await userEvent.type(screen.getByLabelText('Ulangi kata sandi baru'), ulangi);
  await userEvent.click(screen.getByRole('button', { name: 'Simpan kata sandi' }));
}

function responsJson(isiBody: unknown, status = 200): Response {
  return new Response(JSON.stringify(isiBody), { status });
}

describe('FormGantiPassword', () => {
  it('menjelaskan kewajiban ganti kata sandi hanya untuk akun wajib-ganti', () => {
    const { unmount } = render(<FormGantiPassword username="admin" wajib beranda="/admin" />);
    expect(screen.getByRole('status')).toHaveTextContent('Anda harus mengganti kata sandi');
    unmount();

    render(<FormGantiPassword username="admin" wajib={false} beranda="/admin" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dapat menampilkan dan menyembunyikan kata sandi saat tombol toggle diklik', async () => {
    render(<FormGantiPassword username="admin" wajib={false} beranda="/admin" />);

    const fieldBaru = screen.getByLabelText(/^Kata sandi baru/);
    expect(fieldBaru).toHaveAttribute('type', 'password');

    const tombolLihatList = screen.getAllByRole('button', { name: 'Tampilkan kata sandi' });
    expect(tombolLihatList).toHaveLength(3);

    await userEvent.click(tombolLihatList[1]!);
    expect(fieldBaru).toHaveAttribute('type', 'text');

    const tombolSembunyi = screen.getByRole('button', { name: 'Sembunyikan kata sandi' });
    await userEvent.click(tombolSembunyi);
    expect(fieldBaru).toHaveAttribute('type', 'password');
  });

  it('memvalidasi di klien: terlalu pendek, sama dengan username, sama dengan lama, tidak cocok', async () => {
    render(<FormGantiPassword username="admin.bapenda" wajib={false} beranda="/admin" />);

    await isi('lama-12345678', 'pendek', 'beda');

    expect(screen.getByLabelText(/^Kata sandi baru/)).toHaveAccessibleDescription(
      'Kata sandi baru minimal 12 karakter.',
    );
    expect(screen.getByLabelText('Ulangi kata sandi baru')).toHaveAccessibleDescription(
      'Kata sandi baru tidak sama.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menolak kata sandi baru yang sama dengan username', async () => {
    render(<FormGantiPassword username="admin.bapenda.2026" wajib={false} beranda="/admin" />);

    await isi('lama-12345678', 'admin.bapenda.2026', 'admin.bapenda.2026');

    expect(screen.getByLabelText(/^Kata sandi baru/)).toHaveAccessibleDescription(
      'Kata sandi tidak boleh sama dengan username.',
    );
  });

  it('mengirim JSON ke API dan mengarahkan ke beranda setelah berhasil pada akun wajib-ganti', async () => {
    fetchMock.mockResolvedValue(responsJson({ mustChangePassword: false }));
    render(<FormGantiPassword username="admin" wajib beranda="/operator" />);

    await isi('lama-12345678', 'baru-98765432', 'baru-98765432');

    await waitFor(() => {
      expect(bukaHalaman).toHaveBeenCalledWith('/operator');
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/akun/ganti-password');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      passwordLama: 'lama-12345678',
      passwordBaru: 'baru-98765432',
    });
  });

  it('tetap di halaman, mengosongkan form, dan menampilkan konfirmasi pada penggantian sukarela', async () => {
    fetchMock.mockResolvedValue(responsJson({ mustChangePassword: false }));
    render(<FormGantiPassword username="admin" wajib={false} beranda="/admin" />);

    await isi('lama-12345678', 'baru-98765432', 'baru-98765432');

    expect(await screen.findByRole('status')).toHaveTextContent('Kata sandi berhasil diganti.');
    expect(screen.getByLabelText('Kata sandi lama')).toHaveValue('');
    expect(bukaHalaman).not.toHaveBeenCalled();
  });

  it('menampilkan galat per field dari server di bawah field terkait', async () => {
    fetchMock.mockResolvedValue(
      responsJson(
        {
          error: {
            code: 'VALIDASI_GAGAL',
            message: 'Data tidak valid.',
            details: { fields: { passwordLama: 'Kata sandi lama salah.' } },
          },
        },
        400,
      ),
    );
    render(<FormGantiPassword username="admin" wajib={false} beranda="/admin" />);

    await isi('salah-1234567', 'baru-98765432', 'baru-98765432');

    expect(await screen.findByLabelText('Kata sandi lama')).toHaveAccessibleDescription(
      'Kata sandi lama salah.',
    );
  });

  it('menampilkan pesan server dalam alert untuk galat tanpa field (mis. diblokir)', async () => {
    fetchMock.mockResolvedValue(
      responsJson(
        {
          error: {
            code: 'TERLALU_BANYAK_PERMINTAAN',
            message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
          },
        },
        429,
      ),
    );
    render(<FormGantiPassword username="admin" wajib={false} beranda="/admin" />);

    await isi('lama-12345678', 'baru-98765432', 'baru-98765432');

    expect(await screen.findByRole('alert')).toHaveTextContent('Terlalu banyak percobaan.');
  });

  it('menampilkan pesan koneksi terputus tanpa mengosongkan form saat jaringan gagal', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<FormGantiPassword username="admin" wajib={false} beranda="/admin" />);

    await isi('lama-12345678', 'baru-98765432', 'baru-98765432');

    expect(await screen.findByRole('alert')).toHaveTextContent('Koneksi terputus');
    expect(screen.getByLabelText('Kata sandi lama')).toHaveValue('lama-12345678');
  });
});
