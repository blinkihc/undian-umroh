import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConfettiCanvas } from '@/components/undian/confetti-canvas';

describe('ConfettiCanvas', () => {
  it('tidak merender kanvas jika aktif bernilai false', () => {
    const { container } = render(<ConfettiCanvas aktif={false} />);
    expect(screen.queryByTestId('confetti-canvas')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('merender elemen kanvas saat aktif bernilai true', () => {
    render(<ConfettiCanvas aktif={true} />);
    const canvas = screen.getByTestId('confetti-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName.toLowerCase()).toBe('canvas');
    expect(canvas).toHaveClass('pointer-events-none');
  });
});
