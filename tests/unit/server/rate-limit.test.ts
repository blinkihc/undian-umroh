import { describe, expect, it } from 'vitest';

import { BATAS_GAGAL, buatLimiterGagal, getLimiterGagal } from '@/server/rate-limit';

const MENIT = 60 * 1000;

/** Limiter dengan jam palsu: `maju(ms)` menggeser waktu tanpa menunggu. */
function buatUji(): { limiter: ReturnType<typeof buatLimiterGagal>; maju: (ms: number) => void } {
  let sekarang = 1_000_000;
  const limiter = buatLimiterGagal({ ...BATAS_GAGAL, sekarang: () => sekarang });
  return {
    limiter,
    maju: (ms) => {
      sekarang += ms;
    },
  };
}

describe('buatLimiterGagal (5 gagal / 15 menit, blokir 15 menit)', () => {
  it('tidak memblokir sebelum kegagalan kelima', () => {
    const { limiter } = buatUji();

    const hasil = [1, 2, 3, 4].map(() => limiter.catatGagal('a'));

    expect(hasil.every((item) => !item.terblokirSekarang)).toBe(true);
    expect(limiter.cek('a')).toEqual({ terblokir: false, retryAfterDetik: 0 });
  });

  it('memblokir tepat pada kegagalan kelima dan melaporkan sisa waktu', () => {
    const { limiter } = buatUji();
    for (let i = 0; i < 4; i++) limiter.catatGagal('a');

    expect(limiter.catatGagal('a')).toEqual({ terblokirSekarang: true });

    expect(limiter.cek('a')).toEqual({ terblokir: true, retryAfterDetik: 15 * 60 });
  });

  it('melepas blokir setelah 15 menit dan memulai hitungan dari nol', () => {
    const { limiter, maju } = buatUji();
    for (let i = 0; i < 5; i++) limiter.catatGagal('a');

    maju(15 * MENIT - 1);
    expect(limiter.cek('a').terblokir).toBe(true);
    maju(1);
    expect(limiter.cek('a').terblokir).toBe(false);

    for (let i = 0; i < 4; i++) limiter.catatGagal('a');
    expect(limiter.cek('a').terblokir).toBe(false);
  });

  it('tidak memperpanjang blokir oleh percobaan saat sedang terblokir', () => {
    const { limiter, maju } = buatUji();
    for (let i = 0; i < 5; i++) limiter.catatGagal('a');
    maju(10 * MENIT);

    expect(limiter.catatGagal('a')).toEqual({ terblokirSekarang: false });

    expect(limiter.cek('a').retryAfterDetik).toBe(5 * 60);
  });

  it('hanya menghitung kegagalan di dalam jendela 15 menit', () => {
    const { limiter, maju } = buatUji();
    for (let i = 0; i < 4; i++) limiter.catatGagal('a');
    maju(15 * MENIT + 1);

    // Empat kegagalan lama sudah kedaluwarsa, jadi satu kegagalan baru belum memblokir.
    expect(limiter.catatGagal('a')).toEqual({ terblokirSekarang: false });
    expect(limiter.cek('a').terblokir).toBe(false);
  });

  it('memisahkan kunci satu sama lain', () => {
    const { limiter } = buatUji();
    for (let i = 0; i < 5; i++) limiter.catatGagal('a');

    expect(limiter.cek('a').terblokir).toBe(true);
    expect(limiter.cek('b').terblokir).toBe(false);
  });

  it('reset menghapus hitungan dan blokir satu kunci; resetSemua menghapus semuanya', () => {
    const { limiter } = buatUji();
    for (let i = 0; i < 5; i++) {
      limiter.catatGagal('a');
      limiter.catatGagal('b');
    }

    limiter.reset('a');
    expect(limiter.cek('a').terblokir).toBe(false);
    expect(limiter.cek('b').terblokir).toBe(true);

    limiter.resetSemua();
    expect(limiter.cek('b').terblokir).toBe(false);
  });

  it('membersihkan kunci kedaluwarsa saat peta sangat besar tanpa mengganggu kunci aktif', () => {
    const { limiter, maju } = buatUji();
    for (let i = 0; i < 5_000; i++) limiter.catatGagal(`lama-${i.toString()}`);
    maju(16 * MENIT);
    for (let i = 0; i < 5; i++) limiter.catatGagal('baru');

    expect(limiter.cek('baru').terblokir).toBe(true);
    expect(limiter.cek('lama-0').terblokir).toBe(false);
  });
});

describe('getLimiterGagal', () => {
  it('mengembalikan instans yang sama untuk nama yang sama dan terpisah antar nama', () => {
    expect(getLimiterGagal('login')).toBe(getLimiterGagal('login'));
    expect(getLimiterGagal('login')).not.toBe(getLimiterGagal('ganti-password'));
  });
});
