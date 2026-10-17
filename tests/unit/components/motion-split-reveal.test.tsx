import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MotionSplitReveal } from '@/components/ui/motion-split-reveal';

describe('MotionSplitReveal', () => {
  it('merender teks utuh pada aria-label untuk aksesibilitas', () => {
    const teks = 'Undian Umroh OKU Selatan';
    render(<MotionSplitReveal teks={teks} as="h1" />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('aria-label', teks);
  });

  it('memecah kata ke dalam elemen terpisah', () => {
    const teks = 'Langkah Berkah';
    render(<MotionSplitReveal teks={teks} />);

    expect(screen.getByText('Langkah')).toBeInTheDocument();
    expect(screen.getByText('Berkah')).toBeInTheDocument();
  });
});
