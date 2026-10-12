import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnvError, parseEnv } from '@/config/env';
import { validateEnvOrExit } from '@/config/startup';

/** Kunci dummy 32 byte (hanya untuk tes, bukan rahasia). */
const KUNCI_DUMMY = Buffer.alloc(32, 7).toString('base64');

const envValid = {
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://undian:undian@localhost:5432/undian?schema=public',
  AUTH_SECRET: KUNCI_DUMMY,
  NIK_ENCRYPTION_KEY: KUNCI_DUMMY,
  CAPTCHA_HMAC_KEY: KUNCI_DUMMY,
  STORAGE_DIR: './.storage',
};

describe('parseEnv', () => {
  it('menerima konfigurasi lengkap dan mengisi nilai bawaan', () => {
    const env = parseEnv(envValid);

    expect(env.LOG_LEVEL).toBe('info');
    expect(env.TZ).toBe('Asia/Jakarta');
    expect(env.AI_API_KEY).toBeUndefined();
  });

  it('memperlakukan variabel opsional bernilai kosong sebagai tidak diisi', () => {
    const env = parseEnv({ ...envValid, AI_API_KEY: '', AI_PROVIDER: '  ' });

    expect(env.AI_API_KEY).toBeUndefined();
    expect(env.AI_PROVIDER).toBeUndefined();
  });

  it('gagal cepat dan menyebut nama variabel yang hilang', () => {
    const { AUTH_SECRET: _dibuang, ...tanpaSecret } = envValid;

    expect(() => parseEnv(tanpaSecret)).toThrow(EnvError);
    expect(() => parseEnv(tanpaSecret)).toThrow(/AUTH_SECRET: belum diisi/);
  });

  it('menolak kunci yang bukan 32 byte tanpa membocorkan nilainya', () => {
    const kunciPendek = Buffer.alloc(16, 9).toString('base64');

    const jalankan = () => parseEnv({ ...envValid, NIK_ENCRYPTION_KEY: kunciPendek });

    expect(jalankan).toThrow(/NIK_ENCRYPTION_KEY: harus base64 dari tepat 32 byte/);
    expect(jalankan).not.toThrow(new RegExp(kunciPendek.replace(/[+/=]/g, '\\$&')));
  });

  it('menolak APP_URL dengan garis miring di akhir dan DATABASE_URL non-PostgreSQL', () => {
    const hasil = () =>
      parseEnv({ ...envValid, APP_URL: 'http://localhost:3000/', DATABASE_URL: 'mysql://x' });

    expect(hasil).toThrow(/APP_URL: tanpa garis miring di akhir/);
    expect(hasil).toThrow(/DATABASE_URL: harus berawalan postgresql:\/\//);
  });

  it('menolak NODE_ENV di luar development, test, dan production', () => {
    expect(() => parseEnv({ ...envValid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});

describe('validateEnvOrExit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('menghentikan proses dengan kode 1 dan pesan Indonesia bila env salah', () => {
    const tulis = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const keluar = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    validateEnvOrExit({ NODE_ENV: 'test' });

    expect(keluar).toHaveBeenCalledWith(1);
    expect(String(tulis.mock.calls[0]?.[0])).toMatch(/Konfigurasi lingkungan tidak valid/);
  });

  it('tidak menghentikan proses bila env valid', () => {
    const keluar = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    validateEnvOrExit(envValid);

    expect(keluar).not.toHaveBeenCalled();
  });
});
