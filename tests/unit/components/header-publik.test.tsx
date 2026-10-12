import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeaderPublik } from '@/components/publik/header-publik';

describe('HeaderPublik', () => {
  it('menampilkan lambang Pemkab di kiri dan logo Bapenda di kanannya', () => {
    render(<HeaderPublik />);

    const gambar = screen.getAllByRole('img');
    expect(gambar).toHaveLength(2);
    expect(gambar[0]).toHaveAccessibleName(
      /Lambang Pemerintah Kabupaten Ogan Komering Ulu Selatan/,
    );
    expect(gambar[1]).toHaveAccessibleName(/Logo Badan Pendapatan Daerah/);
  });

  it('memakai elemen header semantik', () => {
    render(<HeaderPublik />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
