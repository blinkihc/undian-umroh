import { describe, expect, it } from 'vitest';

import nextConfig from '../../../next.config';

describe('header keamanan dasar (SECURITY §5)', () => {
  it('dipasang di semua rute', async () => {
    const aturan = await nextConfig.headers?.();

    expect(aturan).toHaveLength(1);
    expect(aturan?.[0]?.source).toBe('/:path*');
  });

  it('memuat HSTS, nosniff, referrer policy, permissions policy, dan anti-framing', async () => {
    const aturan = await nextConfig.headers?.();
    const header = Object.fromEntries((aturan?.[0]?.headers ?? []).map((h) => [h.key, h.value]));

    expect(header).toEqual({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'X-Frame-Options': 'DENY',
    });
  });

  it('tidak membocorkan X-Powered-By', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
