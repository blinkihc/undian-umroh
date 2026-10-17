import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HapusPeriodeLokal } from '@/components/admin/periode/hapus-periode-lokal';

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

const { kirimJsonMock } = vi.hoisted(() => ({
  kirimJsonMock: vi.fn(),
}));

vi.mock('@/client/api', () => ({
  kirimJson: kirimJsonMock,
}));

describe('HapusPeriodeLokal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('tidak merender apa pun saat NODE_ENV adalah production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { container } = render(
      <HapusPeriodeLokal id="p-1" judul="Undian 2026" status="TERKUNCI" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('merender tombol hapus lokal dan membutuhkan konfirmasi sebelum menghapus', async () => {
    kirimJsonMock.mockResolvedValue({ ok: true, data: { ok: true, id: 'p-1', judul: 'Undian 2026' } });

    render(<HapusPeriodeLokal id="p-1" judul="Undian 2026" status="TERKUNCI" />);

    const tombolAwal = screen.getByRole('button', { name: 'Hapus Periode Ini (Lokal)' });
    expect(tombolAwal).toBeInTheDocument();

    await userEvent.click(tombolAwal);

    expect(
      screen.getByText(/Apakah Anda benar-benar yakin ingin menghapus periode ini\?/),
    ).toBeInTheDocument();

    const tombolHapusFix = screen.getByRole('button', { name: 'Ya, Hapus Sekarang' });
    await userEvent.click(tombolHapusFix);

    expect(kirimJsonMock).toHaveBeenCalledWith('DELETE', '/api/periode/p-1');
    expect(pushMock).toHaveBeenCalledWith('/admin/periode');
    expect(refreshMock).toHaveBeenCalled();
  });

  it('dapat membatalkan dialog konfirmasi', async () => {
    render(<HapusPeriodeLokal id="p-1" judul="Undian 2026" status="DRAF" />);

    await userEvent.click(screen.getByRole('button', { name: 'Hapus Periode Ini (Lokal)' }));
    expect(screen.getByRole('button', { name: 'Ya, Hapus Sekarang' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(screen.queryByRole('button', { name: 'Ya, Hapus Sekarang' })).not.toBeInTheDocument();
    expect(kirimJsonMock).not.toHaveBeenCalled();
  });
});
