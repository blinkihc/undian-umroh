import { describe, expect, it } from 'vitest';

import { ambilIpKlien, ambilKonteks, buatRequestId, hashIpHarian } from '@/server/request';

describe('buatRequestId', () => {
  it('berformat req_<ulid> dan unik', () => {
    const a = buatRequestId();
    const b = buatRequestId();

    expect(a).toMatch(/^req_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(a).not.toBe(b);
  });
});

describe('ambilIpKlien', () => {
  it('mengambil entri paling kanan yang ditambahkan proxy tepercaya', () => {
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' });

    expect(ambilIpKlien(headers)).toBe('203.0.113.9');
  });

  it('mendukung IPv6 dan menolak nilai yang bukan alamat IP', () => {
    expect(ambilIpKlien(new Headers({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
    expect(ambilIpKlien(new Headers({ 'x-forwarded-for': 'bukan-ip' }))).toBeNull();
    expect(ambilIpKlien(new Headers({ 'x-forwarded-for': '1.2.3.4, ' }))).toBeNull();
  });

  it('mengembalikan null bila header tidak ada', () => {
    expect(ambilIpKlien(new Headers())).toBeNull();
  });
});

describe('ambilKonteks', () => {
  it('memotong user agent 256 karakter', () => {
    const konteks = ambilKonteks(
      new Headers({ 'user-agent': 'a'.repeat(400), 'x-forwarded-for': '1.2.3.4' }),
    );

    expect(konteks.userAgent).toHaveLength(256);
    expect(konteks.ip).toBe('1.2.3.4');
  });

  it('memberi null untuk header yang tidak ada', () => {
    expect(ambilKonteks(new Headers())).toEqual({ ip: null, userAgent: null });
  });
});

describe('hashIpHarian', () => {
  const hari = new Date('2026-10-12T05:00:00Z');

  it('stabil dalam sehari, berubah antar hari, dan tidak memuat IP mentah', () => {
    const a = hashIpHarian('203.0.113.9', hari);

    expect(a).toBe(hashIpHarian('203.0.113.9', new Date('2026-10-12T20:00:00Z')));
    expect(a).not.toBe(hashIpHarian('203.0.113.9', new Date('2026-10-13T05:00:00Z')));
    expect(a).not.toBe(hashIpHarian('203.0.113.10', hari));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toContain('203');
  });

  it('memakai tanda hubung bila IP tidak diketahui', () => {
    expect(hashIpHarian(null, hari)).toBe('-');
  });
});
