import { describe, expect, it } from 'vitest';

import { buatLogger } from '@/server/logger';

/** Logger yang menampung baris JSON ke memori alih-alih stdout. */
function buatPenampung(): {
  baris: () => Record<string, unknown>[];
  tujuan: { write: (msg: string) => void };
} {
  const mentah: string[] = [];
  return {
    tujuan: {
      write(msg) {
        mentah.push(msg);
      },
    },
    baris: () => mentah.map((item) => JSON.parse(item) as Record<string, unknown>),
  };
}

describe('buatLogger', () => {
  it('menulis JSON satu baris dengan level berupa teks, waktu ISO, dan field requestId', () => {
    const { tujuan, baris } = buatPenampung();

    buatLogger('info', tujuan)
      .child({ requestId: 'req_UJI' })
      .info({ status: 200 }, 'request selesai');

    const [catatan] = baris();
    expect(catatan).toMatchObject({
      level: 'info',
      msg: 'request selesai',
      requestId: 'req_UJI',
      status: 200,
    });
    expect(String(catatan?.time)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(catatan).not.toHaveProperty('pid');
    expect(catatan).not.toHaveProperty('hostname');
  });

  it('menyamarkan kata sandi, kunci, token, NIK, dan captcha di tingkat teratas dan satu tingkat dalam', () => {
    const { tujuan, baris } = buatPenampung();
    const logger = buatLogger('info', tujuan);

    logger.info(
      {
        password: 'rahasia-1',
        passwordBaru: 'rahasia-2',
        nik: '1609999999990001',
        data: {
          passwordLama: 'rahasia-3',
          apiKey: 'sk-rahasia',
          captcha: 'tantangan',
          token: 'jwt-rahasia',
        },
      },
      'uji',
    );

    const teks = JSON.stringify(baris());
    for (const rahasia of [
      'rahasia-1',
      'rahasia-2',
      '1609999999990001',
      'rahasia-3',
      'sk-rahasia',
      'tantangan',
      'jwt-rahasia',
    ]) {
      expect(teks).not.toContain(rahasia);
    }
    expect(teks).toContain('[DISEMBUNYIKAN]');
  });

  it('menyamarkan header cookie dan authorization pada request serta set-cookie pada respons', () => {
    const { tujuan, baris } = buatPenampung();

    buatLogger('info', tujuan).info(
      {
        req: {
          headers: {
            cookie: 'authjs.session-token=SESI-RAHASIA',
            authorization: 'Bearer TOKEN-RAHASIA',
            host: 'x',
          },
        },
        res: { headers: { 'set-cookie': 'authjs.session-token=SESI-BARU' } },
      },
      'uji',
    );

    const teks = JSON.stringify(baris());
    expect(teks).not.toMatch(/SESI-RAHASIA|TOKEN-RAHASIA|SESI-BARU/);
    expect(teks).toContain('"host":"x"');
  });

  it('menghormati level: debug tidak ditulis pada level info', () => {
    const { tujuan, baris } = buatPenampung();
    const logger = buatLogger('info', tujuan);

    logger.debug('tidak tampil');
    logger.warn('tampil');

    expect(baris().map((item) => item.msg)).toEqual(['tampil']);
  });
});
