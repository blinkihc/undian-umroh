import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AksiAkun } from '@/components/admin/pengguna/aksi-akun';

const fetchMock = vi.fn();
const onSelesai = vi.fn();

const AKUN = { id: 'p1', username: 'operator.satu', aktif: true, version: 4 };

beforeEach(() => {
  fetchMock.mockReset();
  onSelesai.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jawab(isi: unknown, status = 200): Response {
  return new Response(JSON.stringify(isi), { status });
}

describe('AksiAkun', () => {
  it('meminta konfirmasi sebelum menonaktifkan, lalu mengirim PATCH dengan version', async () => {
    fetchMock.mockResolvedValue(jawab({ ...AKUN, aktif: false, version: 5 }));
    render(<AksiAkun akun={AKUN} diriSendiri={false} onSelesai={onSelesai} />);

    await userEvent.click(screen.getByRole('button', { name: 'Nonaktifkan' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Nonaktifkan operator.satu?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ya, nonaktifkan' }));

    await waitFor(() => {
      expect(onSelesai).toHaveBeenCalledWith({
        ok: true,
        pesan: 'Akun operator.satu dinonaktifkan.',
      });
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/pengguna/p1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ version: 4, aktif: false });
  });

  it('Batal pada konfirmasi tidak mengirim apa pun', async () => {
    render(<AksiAkun akun={AKUN} diriSendiri={false} onSelesai={onSelesai} />);

    await userEvent.click(screen.getByRole('button', { name: 'Nonaktifkan' }));
    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));

    expect(screen.getByRole('button', { name: 'Nonaktifkan' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tidak menampilkan Nonaktifkan untuk akun sendiri', () => {
    render(<AksiAkun akun={AKUN} diriSendiri onSelesai={onSelesai} />);

    expect(screen.queryByRole('button', { name: 'Nonaktifkan' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset kata sandi' })).toBeInTheDocument();
  });

  it('menampilkan Aktifkan untuk akun nonaktif', async () => {
    fetchMock.mockResolvedValue(jawab({ ...AKUN, aktif: true }));
    render(<AksiAkun akun={{ ...AKUN, aktif: false }} diriSendiri={false} onSelesai={onSelesai} />);

    await userEvent.click(screen.getByRole('button', { name: 'Aktifkan' }));

    await waitFor(() => {
      expect(onSelesai).toHaveBeenCalledWith({ ok: true, pesan: 'Akun operator.satu diaktifkan.' });
    });
  });

  it('memvalidasi kata sandi reset di klien dan mengirimnya bila valid', async () => {
    fetchMock.mockResolvedValue(jawab({ ...AKUN, version: 5 }));
    render(<AksiAkun akun={AKUN} diriSendiri={false} onSelesai={onSelesai} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reset kata sandi' }));
    const field = screen.getByLabelText(/^Kata sandi sementara/);
    await userEvent.type(field, 'pendek');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(field).toHaveAccessibleDescription('Kata sandi awal minimal 12 karakter.');
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.clear(field);
    await userEvent.type(field, 'kata-sandi-reset-1');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(onSelesai).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      version: 4,
      resetPassword: 'kata-sandi-reset-1',
    });
  });

  it('meneruskan pesan server (mis. konflik version) sebagai kegagalan', async () => {
    fetchMock.mockResolvedValue(
      jawab({ error: { code: 'CONFLICT', message: 'Akun ini baru saja diubah orang lain.' } }, 409),
    );
    render(<AksiAkun akun={{ ...AKUN, aktif: false }} diriSendiri={false} onSelesai={onSelesai} />);

    await userEvent.click(screen.getByRole('button', { name: 'Aktifkan' }));

    await waitFor(() => {
      expect(onSelesai).toHaveBeenCalledWith({
        ok: false,
        pesan: 'Akun ini baru saja diubah orang lain.',
      });
    });
  });
});
