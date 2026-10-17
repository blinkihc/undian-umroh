import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Makkah3DMotion } from '@/components/publik/beranda/makkah-3d-motion';

describe('Makkah3DMotion', () => {
  it('merender elemen gambar 3D Ka\'bah dengan alt text yang tepat', () => {
    render(<Makkah3DMotion />);

    const gambar = screen.getByRole('img', { name: /Visual 3D Ka'bah/i });
    expect(gambar).toBeInTheDocument();
    expect(gambar).toHaveAttribute('src', '/brand/3D-Makkah.png');
  });
});
