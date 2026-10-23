import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TampilanPemenangPublik } from '@/components/publik/pemenang/tampilan-pemenang';
import { type PemenangPublikRespons } from '@/server/services/pemenang';

describe('TampilanPemenangPublik - Bukti Penyerahan Simbolis', () => {
  const dummyPublikDenganFoto: PemenangPublikRespons = {
    status: 'DIPUBLIKASI',
    periode: {
      id: 'periode-2026',
      judul: 'Undian Umroh OKU Selatan 2026',
      tanggalAcara: '2026-08-17',
      lokasiAcara: 'Stadion Mini Muaradua',
      publishedAt: '2026-08-17 14:00 WIB',
      updatedAt: '2026-08-17 14:00 WIB',
    },
    integritas: {
      snapshotHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      hasilHash: '123456abcdef7890123456abcdef7890123456abcdef7890123456abcdef7890',
      pesertaPerWilayah: [
        { kode: 'W1', nama: 'Wilayah 1', jumlahPeserta: 1000 },
        { kode: 'W2', nama: 'Wilayah 2', jumlahPeserta: 1500 },
      ],
      totalPeserta: 2500,
    },
    wilayah: [
      {
        kode: 'W1',
        nama: 'Wilayah 1',
        status: 'TERVERIFIKASI',
        slot: [
          {
            kode: 'W1-UTAMA',
            status: 'TERVERIFIKASI',
            penerimaAktif: true,
            diperbaruiAt: '2026-08-17 11:00 WIB',
            fotoDokumentasi: ['foto_pemenang_w1_a', 'foto_pemenang_w1_b'],
            diserahkanAt: '2026-08-17 10:30 WIB',
            diserahkanCatatan: 'Penyerahan simbolis tiket dan cinderamata umroh oleh Sekda',
            peserta: {
              nopMasked: '16.09.010.xxx.xxx-0001.0',
              nikMasked: '1609xxxxxxxx0001',
              nama: 'AHMAD SUBARJO',
              alamatWp: 'JL. MERDEKA NO. 12',
              alamatOp: 'JL. MERDEKA NO. 12',
              kecamatan: 'MUARADUA',
              kelurahan: 'PASAR MUARADUA',
              lunas: { '2022': 'Lunas' },
            },
          },
        ],
      },
      {
        kode: 'W2',
        nama: 'Wilayah 2',
        status: 'TERVERIFIKASI',
        slot: [
          {
            kode: 'W2-UTAMA',
            status: 'TERVERIFIKASI',
            penerimaAktif: true,
            diperbaruiAt: '2026-08-17 11:30 WIB',
            fotoDokumentasi: [],
            diserahkanAt: null,
            diserahkanCatatan: null,
            peserta: {
              nopMasked: '16.09.020.xxx.xxx-0002.0',
              nikMasked: '1609xxxxxxxx0002',
              nama: 'SITI KHADIJAH',
              alamatWp: 'JL. DANAU RANAU NO. 5',
              alamatOp: 'JL. DANAU RANAU NO. 5',
              kecamatan: 'BANDING AGUNG',
              kelurahan: 'SUKARAJA',
              lunas: { '2022': 'Lunas' },
            },
          },
        ],
      },
    ],
  };

  it(
    'merender lencana dan galeri foto simbolis pada pemenang yang memiliki dokumentasi',
    () => {
      render(<TampilanPemenangPublik data={dummyPublikDenganFoto} />);

    // Wilayah 1 memiliki foto dokumentasi
    expect(screen.getByText('AHMAD SUBARJO')).toBeInTheDocument();
    expect(screen.getByText('Bukti Penyerahan Simbolis')).toBeInTheDocument();
    expect(screen.getByText('Hadiah Telah Diserahkan')).toBeInTheDocument();
    expect(
      screen.getByText(/Penyerahan simbolis tiket dan cinderamata umroh oleh Sekda/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Waktu penyerahan: 2026-08-17 10:30 WIB/i)).toBeInTheDocument();

    const thumbnails = screen.getAllByTitle(/Perbesar foto bukti penyerahan simbolis/i);
    expect(thumbnails.length).toBe(2);

    // Wilayah 2 belum memiliki foto dokumentasi, kartu tetap tampil tanpa bagian galeri
    expect(screen.getByText('SITI KHADIJAH')).toBeInTheDocument();
  }, 15000);

  it('membuka modal lightbox foto penuh dan navigasi antar-foto', () => {
    render(<TampilanPemenangPublik data={dummyPublikDenganFoto} />);

    const thumbnails = screen.getAllByTitle(/Perbesar foto bukti penyerahan simbolis/i);
    const thumbPertama = thumbnails[0];
    expect(thumbPertama).toBeDefined();
    if (!thumbPertama) return;

    fireEvent.click(thumbPertama);

    // Lightbox modal terbuka
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Foto 1 dari 2/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Penyerahan Simbolis — AHMAD SUBARJO \(W1-UTAMA\)/i),
    ).toBeInTheDocument();

    // Navigasi ke foto berikutnya
    const tombolNext = screen.getByTitle(/Foto selanjutnya/i);
    fireEvent.click(tombolNext);
    expect(screen.getByText(/Foto 2 dari 2/i)).toBeInTheDocument();

    // Tutup lightbox dengan tombol Esc atau tombol silang
    const tombolTutup = screen.getByTitle(/Tutup \(Esc\)/i);
    fireEvent.click(tombolTutup);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }, 15000);

  it('merender tata letak nama-desa dan mendukung buka-tutup akordeon integritas', () => {
    render(<TampilanPemenangPublik data={dummyPublikDenganFoto} />);

    // Memverifikasi label Desa (bukan Kelurahan) dan data wilayah
    expect(screen.getByText('Desa PASAR MUARADUA')).toBeInTheDocument();
    expect(screen.getByText('Kec. MUARADUA')).toBeInTheDocument();
    expect(screen.getAllByText(/NOP:/i).length).toBeGreaterThanOrEqual(2);

    // Memverifikasi footer lama status verifikasi tidak ada di kartu
    expect(screen.queryByText(/Status Verifikasi: Sah/i)).not.toBeInTheDocument();

    // Akordeon integritas
    const tombolAkordeon = screen.getByRole('button', {
      name: /Bukti Integritas Kriptografis & Rekapitulasi Peserta/i,
    });
    expect(tombolAkordeon).toBeInTheDocument();
    expect(tombolAkordeon.getAttribute('aria-expanded')).toBe('false');

    // Buka akordeon
    fireEvent.click(tombolAkordeon);
    expect(tombolAkordeon.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/Rekapitulasi Peserta & Pembanding Kriteria/i)).toBeInTheDocument();
    expect(screen.getByText(/Tidak Lolos Syarat/i)).toBeInTheDocument();
  }, 15000);
});
