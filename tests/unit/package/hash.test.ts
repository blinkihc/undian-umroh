import { describe, expect, it } from 'vitest';

import { canonicalStringify, formatHashRingkas, sha256Hex } from '@/lib/package/hash';

describe('canonicalStringify', () => {
  it('mengurutkan kunci objek secara leksikografis rekursif tanpa spasi', () => {
    const objek = {
      z: 1,
      b: { d: 'nilai', a: 10 },
      a: [3, 2, 1],
    };
    expect(canonicalStringify(objek)).toBe('{"a":[3,2,1],"b":{"a":10,"d":"nilai"},"z":1}');
  });

  it('mengabaikan properti dengan nilai undefined', () => {
    const objek = { a: 1, b: undefined, c: 'ok' };
    expect(canonicalStringify(objek)).toBe('{"a":1,"c":"ok"}');
  });

  it('mempertahankan nilai boolean dan null', () => {
    expect(canonicalStringify({ benar: true, salah: false, kosong: null })).toBe(
      '{"benar":true,"kosong":null,"salah":false}',
    );
  });

  it('menolak bilangan bukan integer / pecahan', () => {
    expect(() => canonicalStringify({ angka: 3.14 })).toThrow(/bilangan bulat/);
    expect(() => canonicalStringify({ angka: NaN })).toThrow(/bilangan bulat/);
    expect(() => canonicalStringify({ angka: Infinity })).toThrow(/bilangan bulat/);
  });

  it('menolak tipe yang tidak didukung (fungsi, simbol)', () => {
    expect(() => canonicalStringify(() => {})).toThrow(/Tipe tidak didukung/);
    expect(() => canonicalStringify(Symbol('x'))).toThrow(/Tipe tidak didukung/);
  });

  it('menangani string kosong dan array kosong', () => {
    expect(canonicalStringify({ teks: '', arr: [] })).toBe('{"arr":[],"teks":""}');
  });

  it('mengubah undefined di dalam array menjadi null', () => {
    expect(canonicalStringify([1, undefined, 2])).toBe('[1,null,2]');
  });
});

describe('sha256Hex', () => {
  it('deterministik: string identik selalu menghasilkan hash yang sama', async () => {
    const data = '{"periodeId":"clx1","peserta":[]}';
    const hash1 = await sha256Hex(data);
    const hash2 = await sha256Hex(data);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('avalanche effect: satu karakter berubah menghasilkan hash yang berbeda drastis', async () => {
    const h1 = await sha256Hex('Undian OKU Selatan 2026');
    const h2 = await sha256Hex('Undian OKU Selatan 2027');
    expect(h1).not.toBe(h2);
  });

  it('menerima Uint8Array sebagai masukan langsung', async () => {
    const bytes = new TextEncoder().encode('halo');
    const h1 = await sha256Hex('halo');
    const h2 = await sha256Hex(bytes);
    expect(h1).toBe(h2);
  });
});

describe('formatHashRingkas', () => {
  it('memotong 8 karakter awal dan akhir dalam huruf besar', () => {
    const hash = '3f9a1c0be8d927ab1029384756abcdef1234567890abcdef12345678d27e44a1';
    expect(formatHashRingkas(hash)).toBe('3F9A1C0B…D27E44A1');
  });

  it('mengembalikan teks huruf besar utuh bila panjang <= 16', () => {
    expect(formatHashRingkas('abcdef12')).toBe('ABCDEF12');
  });
});
