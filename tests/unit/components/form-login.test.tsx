import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { bukaHalaman, kirimLogin } = vi.hoisted(() => ({
  bukaHalaman: vi.fn(),
  kirimLogin: vi.fn(),
}));

vi.mock('@/components/akun/auth-klien', () => ({ kirimLogin, bukaHalaman }));

import { FormLogin } from '@/components/akun/form-login';

beforeEach(() => {
  bukaHalaman.mockClear();
  kirimLogin.mockReset();
});

describe('FormLogin', () => {
  it('menampilkan field berlabel dan tombol Masuk', () => {
    render(<FormLogin callbackUrl={null} />);

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Kata sandi')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeEnabled();
  });

  it('dapat menampilkan dan menyembunyikan kata sandi saat tombol toggle diklik', async () => {
    render(<FormLogin callbackUrl={null} />);

    const fieldPassword = screen.getByLabelText('Kata sandi');
    expect(fieldPassword).toHaveAttribute('type', 'password');

    const tombolLihat = screen.getByRole('button', { name: 'Tampilkan kata sandi' });
    await userEvent.click(tombolLihat);

    expect(fieldPassword).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Sembunyikan kata sandi' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sembunyikan kata sandi' }));
    expect(fieldPassword).toHaveAttribute('type', 'password');
  });

  it('menolak isian kosong dengan pesan per field tanpa memanggil server', async () => {
    render(<FormLogin callbackUrl={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    const username = screen.getByLabelText('Username');
    expect(username).toHaveAttribute('aria-invalid', 'true');
    expect(username).toHaveAccessibleDescription('Username wajib diisi.');
    expect(screen.getByLabelText('Kata sandi')).toHaveAccessibleDescription(
      'Kata sandi wajib diisi.',
    );
    expect(kirimLogin).not.toHaveBeenCalled();
  });

  it('menampilkan pesan gagal dari server dalam alert dan mengaktifkan lagi tombolnya', async () => {
    kirimLogin.mockResolvedValue({
      ok: false,
      jenis: 'gagal',
      pesan: 'Username atau kata sandi salah.',
    });
    render(<FormLogin callbackUrl={null} />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'salah');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Username atau kata sandi salah.');
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeEnabled();
    expect(bukaHalaman).not.toHaveBeenCalled();
  });

  it('merapikan username sebelum dikirim', async () => {
    kirimLogin.mockResolvedValue({ ok: false, jenis: 'gagal', pesan: 'x' });
    render(<FormLogin callbackUrl={null} />);

    await userEvent.type(screen.getByLabelText('Username'), '  Admin.Bapenda ');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'Rahasia');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(kirimLogin).toHaveBeenCalledWith('admin.bapenda', 'Rahasia');
    });
  });

  it('menunjukkan keadaan memuat: tombol nonaktif, aria-busy, dan label Memproses', async () => {
    kirimLogin.mockReturnValue(new Promise(() => undefined));
    render(<FormLogin callbackUrl={null} />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    const tombol = await screen.findByRole('button', { name: 'Memproses…' });
    expect(tombol).toBeDisabled();
    expect(tombol).toHaveAttribute('aria-busy', 'true');
  });

  it('setelah berhasil membuka /login agar server memilih tujuan sesuai peran', async () => {
    kirimLogin.mockResolvedValue({ ok: true });
    render(<FormLogin callbackUrl={null} />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(bukaHalaman).toHaveBeenCalledWith('/login');
    });
  });

  it('meneruskan halaman tujuan semula lewat callbackUrl', async () => {
    kirimLogin.mockResolvedValue({ ok: true });
    render(<FormLogin callbackUrl="/admin/periode" />);

    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.type(screen.getByLabelText('Kata sandi'), 'rahasia');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(bukaHalaman).toHaveBeenCalledWith('/login?callbackUrl=%2Fadmin%2Fperiode');
    });
  });
});
