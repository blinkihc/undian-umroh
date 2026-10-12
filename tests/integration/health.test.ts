import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/health/route';
import { getDb, tutupDb } from '@/server/db';
import { cekKesehatan } from '@/server/services/kesehatan';

import { buatRequest } from './helpers/aplikasi';
import { senyapkanLog } from './helpers/log';

let pulihkanLog: () => void;

beforeEach(() => {
  pulihkanLog = senyapkanLog();
});

afterEach(() => {
  vi.restoreAllMocks();
  pulihkanLog();
});

afterAll(async () => {
  await tutupDb();
});

describe('GET /api/health', () => {
  it('publik: melaporkan aplikasi dan database sehat tanpa sesi', async () => {
    const respons = await GET(buatRequest('/api/health'));

    expect(respons.status).toBe(200);
    expect(await respons.json()).toEqual({ status: 'ok', db: 'ok', versi: '0.1.0' });
    expect(respons.headers.get('X-Request-Id')).toMatch(/^req_/);
    expect(respons.headers.get('Cache-Control')).toBe('no-store');
  });

  it('mengembalikan 503 bila database tidak dapat dijangkau', async () => {
    vi.spyOn(getDb(), '$queryRaw').mockRejectedValue(new Error('koneksi putus'));

    const respons = await GET(buatRequest('/api/health'));

    expect(respons.status).toBe(503);
    expect(await respons.json()).toEqual({ status: 'gagal', db: 'gagal', versi: '0.1.0' });
  });

  it('tidak membocorkan detail error database di badan respons', async () => {
    const rahasia = 'password=rahasia-koneksi';
    vi.spyOn(getDb(), '$queryRaw').mockRejectedValue(new Error(rahasia));

    const respons = await GET(buatRequest('/api/health'));

    expect(await respons.text()).not.toContain(rahasia);
  });
});

describe('cekKesehatan', () => {
  it('menandai gagal bila ping database melempar error', async () => {
    const hasil = await cekKesehatan(() => Promise.reject(new Error('mati')));

    expect(hasil).toMatchObject({ status: 'gagal', db: 'gagal' });
  });
});
