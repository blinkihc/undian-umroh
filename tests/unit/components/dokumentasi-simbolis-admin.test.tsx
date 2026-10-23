import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DokumentasiSimbolisAdmin } from '@/components/admin/pemenang/dokumentasi-simbolis-admin';
import { type SlotPemenangRespons } from '@/lib/domain/pemenang';

describe('DokumentasiSimbolisAdmin', () => {
  const dummySlotKosong: SlotPemenangRespons = {
    kode: 'W1-UTAMA',
    status: 'TERVERIFIKASI',
    penerimaAktif: true,
    fotoDokumentasi: [],
    diserahkanAt: null,
    diserahkanCatatan: null,
    peserta: {
      nopFormat: '16.09.010.001.001-0001.0',
      nikMasked: '1609xxxxxxxx0001',
      nama: 'H. AHMAD DAHLAN',
      alamatWp: 'JL. MERDEKA NO. 1',
      alamatOp: 'JL. MERDEKA NO. 1',
      kecamatan: 'MUARADUA',
      kelurahan: 'KISAM TINGGI',
      lunas: { '2022': '10/05/2022' },
    },
    version: 1,
    riwayat: [],
  };

  const dummySlotAdaFoto: SlotPemenangRespons = {
    ...dummySlotKosong,
    fotoDokumentasi: ['foto_aset_1', 'foto_aset_2'],
    diserahkanAt: '2026-08-17 10:00 WIB',
    diserahkanCatatan: 'Diserahkan oleh Bupati di Pendopo',
  };

  it('merender kondisi awal ketika belum ada foto dokumentasi', () => {
    render(
      <DokumentasiSimbolisAdmin
        periodeId="periode-1"
        slot={dummySlotKosong}
        onBerhasil={vi.fn()}
        onError={vi.fn()}
        onSukses={vi.fn()}
      />,
    );

    expect(screen.getByText('Bukti Penyerahan Simbolis')).toBeInTheDocument();
    expect(screen.getByText('Belum Ada Foto')).toBeInTheDocument();
    expect(screen.getByText(/Unggah Foto Bukti \(3 slot tersisa\)/i)).toBeInTheDocument();
  });

  it('merender galeri thumbnail dan catatan saat foto sudah diunggah', () => {
    render(
      <DokumentasiSimbolisAdmin
        periodeId="periode-1"
        slot={dummySlotAdaFoto}
        onBerhasil={vi.fn()}
        onError={vi.fn()}
        onSukses={vi.fn()}
      />,
    );

    expect(screen.getByText('2/3 Foto Tersimpan')).toBeInTheDocument();
    expect(screen.getByText(/Unggah Foto Bukti \(1 slot tersisa\)/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Diserahkan oleh Bupati di Pendopo')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-17 10:00 WIB/i)).toBeInTheDocument();

    const gambarList = screen.getAllByRole('img');
    expect(gambarList.length).toBe(2);
    expect(gambarList[0]?.getAttribute('src')).toBe('/api/aset/foto_aset_1');
    expect(gambarList[1]?.getAttribute('src')).toBe('/api/aset/foto_aset_2');
  });

  it('membuka modal lightbox pratinjau penuh saat tombol pratinjau diklik', () => {
    render(
      <DokumentasiSimbolisAdmin
        periodeId="periode-1"
        slot={dummySlotAdaFoto}
        onBerhasil={vi.fn()}
        onError={vi.fn()}
        onSukses={vi.fn()}
      />,
    );

    const tombolPratinjauList = screen.getAllByTitle('Pratinjau Penuh');
    expect(tombolPratinjauList.length).toBe(2);

    const tombolPertama = tombolPratinjauList[0];
    expect(tombolPertama).toBeDefined();
    if (!tombolPertama) return;

    fireEvent.click(tombolPertama);

    expect(screen.getByTitle('Tutup Pratinjau')).toBeInTheDocument();
    expect(screen.getByAltText('Dokumentasi penuh W1-UTAMA')).toBeInTheDocument();

    // Tutup modal
    fireEvent.click(screen.getByTitle('Tutup Pratinjau'));
    expect(screen.queryByTitle('Tutup Pratinjau')).not.toBeInTheDocument();
  });

  it('menolak unggahan berkas non-gambar dengan memanggil onError', () => {
    const onErrorMock = vi.fn();
    const { container } = render(
      <DokumentasiSimbolisAdmin
        periodeId="periode-1"
        slot={dummySlotKosong}
        onBerhasil={vi.fn()}
        onError={onErrorMock}
        onSukses={vi.fn()}
      />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    const filePdf = new File(['%PDF-1.4'], 'dokumen.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [filePdf] } });

    expect(onErrorMock).toHaveBeenCalledWith('Format berkas harus berupa JPG, PNG, atau WebP.');
  });
});
