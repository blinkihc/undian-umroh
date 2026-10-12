import { describe, expect, it } from 'vitest';

import { dekripsiNik, enkripsiNik } from '@/server/nik';

const KUNCI = Buffer.alloc(32, 7);
const NIK = '1609990101900001';

describe('enkripsi NIK AES-256-GCM', () => {
  it('format iv(12) || ciphertext || tag(16) dan dapat didekripsi kembali utuh', () => {
    const data = enkripsiNik(NIK, KUNCI);

    expect(data.length).toBe(12 + NIK.length + 16);
    expect(data.toString('latin1')).not.toContain(NIK);
    expect(dekripsiNik(data, KUNCI)).toBe(NIK);
  });

  it('IV acak: NIK sama menghasilkan ciphertext berbeda', () => {
    expect(enkripsiNik(NIK, KUNCI).equals(enkripsiNik(NIK, KUNCI))).toBe(false);
  });

  it('data diubah atau kunci salah ditolak', () => {
    const data = enkripsiNik(NIK, KUNCI);
    const rusak = Buffer.from(data);
    rusak[14] = (rusak[14] ?? 0) ^ 1;

    expect(() => dekripsiNik(rusak, KUNCI)).toThrow();
    expect(() => dekripsiNik(data, Buffer.alloc(32, 8))).toThrow();
  });
});
