import { randomBytes } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppError, galatValidasi } from '@/server/errors';
import { getDb, tutupDb } from '@/server/db';
import { bacaJson, responsJson, withHandler } from '@/server/http';

import { buatRequest } from './helpers/aplikasi';
import { senyapkanLog } from './helpers/log';
import { buatPengguna } from './helpers/pengguna';

afterAll(async () => {
  await tutupDb();
});

type IsiGalat = {
  error: { code: string; message: string; details?: Record<string, unknown>; requestId: string };
};

describe('withHandler', () => {
  it('menambah X-Request-Id di respons sukses dan error dengan requestId yang sama di badan error', async () => {
    const sukses = await withHandler(() => Promise.resolve({ ok: true }))(buatRequest('/api/x'));
    const gagal = await withHandler(() => {
      throw new AppError('TIDAK_DITEMUKAN', 404, 'Data tidak ditemukan.');
    })(buatRequest('/api/x'));

    expect(sukses.headers.get('X-Request-Id')).toMatch(/^req_/);
    const isi = (await gagal.json()) as IsiGalat;
    expect(gagal.headers.get('X-Request-Id')).toBe(isi.error.requestId);
  });

  it('memetakan AppError ke status, kode, pesan, dan detail yang dilempar', async () => {
    const handler = withHandler(() => {
      throw new AppError('CONFLICT', 409, 'Data sudah berubah.', { versi: 3 });
    });

    const respons = await handler(buatRequest('/api/x'));

    expect(respons.status).toBe(409);
    expect(((await respons.json()) as IsiGalat).error).toMatchObject({
      code: 'CONFLICT',
      message: 'Data sudah berubah.',
      details: { versi: 3 },
    });
  });

  it('memetakan galat validasi zod ke 400 dengan pesan per field berbahasa Indonesia', async () => {
    const skema = z.strictObject({
      nama: z.string().min(3, 'Nama minimal 3 karakter.'),
      umur: z.number(),
    });
    const handler = withHandler(async (request) => {
      await bacaJson(request, skema);
      return {};
    });

    const respons = await handler(buatRequest('/api/x', { json: { nama: 'ab', ekstra: 1 } }));

    expect(respons.status).toBe(400);
    const { error } = (await respons.json()) as IsiGalat;
    expect(error.code).toBe('VALIDASI_GAGAL');
    const fields = (error.details as { fields: Record<string, string> }).fields;
    expect(Object.keys(fields).sort()).toEqual(['(isi)', 'nama', 'umur']);
    expect(fields.nama).toBe('Nama minimal 3 karakter.');
    // Pesan bawaan zod tidak boleh berbahasa Inggris.
    expect(JSON.stringify(fields)).not.toMatch(/Invalid input|expected|Unrecognized/i);
  });

  it('memetakan galat validasi buatan service melalui galatValidasi', async () => {
    const handler = withHandler(() => {
      throw galatValidasi({ judul: 'Judul minimal 5 karakter.' });
    });

    const respons = await handler(buatRequest('/api/x'));

    expect(((await respons.json()) as IsiGalat).error.details).toEqual({
      fields: { judul: 'Judul minimal 5 karakter.' },
    });
  });

  it('memetakan pelanggaran unik Prisma sungguhan ke 409 CONFLICT tanpa membocorkan pesan Prisma', async () => {
    const pengguna = await buatPengguna();
    const handler = withHandler(async () => {
      await getDb().pengguna.create({
        data: { username: pengguna.username, nama: 'Ganda', passwordHash: 'x', peran: 'ADMIN' },
      });
      return {};
    });

    const respons = await handler(buatRequest('/api/x'));

    expect(respons.status).toBe(409);
    const teks = JSON.stringify(await respons.json());
    expect(teks).toContain('CONFLICT');
    expect(teks).not.toMatch(/Prisma|pengguna_username_key|constraint/i);
  });

  it('mengembalikan 500 generik berisi requestId tanpa membocorkan error asli', async () => {
    const rahasia = `rahasia-internal-${randomBytes(4).toString('hex')}`;
    const handler = withHandler(() => {
      throw new Error(rahasia);
    });
    const pulihkanLog = senyapkanLog();

    const respons = await handler(buatRequest('/api/x'));
    pulihkanLog();

    expect(respons.status).toBe(500);
    const teks = await respons.text();
    const { error } = JSON.parse(teks) as IsiGalat;
    expect(error.code).toBe('KESALAHAN_SERVER');
    expect(error.message).toContain(error.requestId);
    expect(teks).not.toContain(rahasia);
    expect(teks).not.toMatch(/stack|at .*\(.*:\d+:\d+\)/);
  });

  it('menyertakan Retry-After pada 429', async () => {
    const handler = withHandler(() => {
      throw new AppError('TERLALU_BANYAK_PERMINTAAN', 429, 'Terlalu banyak.', {
        retryAfterDetik: 120,
      });
    });

    const respons = await handler(buatRequest('/api/x'));

    expect(respons.status).toBe(429);
    expect(respons.headers.get('Retry-After')).toBe('120');
  });

  it('menolak isi JSON rusak dengan 400 dan isi terlalu besar dengan 413', async () => {
    const handler = withHandler(async (request) => {
      await bacaJson(request, z.object({}), 50);
      return {};
    });

    const rusak = await handler(
      buatRequest('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' } }),
    );
    const besar = await handler(buatRequest('/api/x', { json: { isi: 'x'.repeat(200) } }));

    expect(rusak.status).toBe(400);
    expect(((await rusak.json()) as IsiGalat).error.code).toBe('VALIDASI_GAGAL');
    expect(besar.status).toBe(413);
    expect(((await besar.json()) as IsiGalat).error.code).toBe('FILE_TERLALU_BESAR');
  });

  it('meneruskan parameter rute dan mengizinkan handler mengembalikan Response sendiri', async () => {
    const handler = withHandler<{ id: string }>((_request, ctx) =>
      Promise.resolve(responsJson({ id: ctx.params.id }, { status: 201 })),
    );

    const respons = await handler(buatRequest('/api/x/abc'), {
      params: Promise.resolve({ id: 'abc' }),
    });

    expect(respons.status).toBe(201);
    expect(await respons.json()).toEqual({ id: 'abc' });
    expect(respons.headers.get('Cache-Control')).toBe('no-store');
  });

  it('tidak memeriksa Origin untuk GET tetapi wajib untuk POST, PUT, PATCH, dan DELETE', async () => {
    const handler = withHandler(() => Promise.resolve({ ok: true }));

    const get = await handler(buatRequest('/api/x', { origin: 'https://jahat.example' }));
    const hasilMutasi = await Promise.all(
      ['POST', 'PUT', 'PATCH', 'DELETE'].map((method) =>
        handler(buatRequest('/api/x', { method, origin: 'https://jahat.example' })),
      ),
    );

    expect(get.status).toBe(200);
    expect(hasilMutasi.map((respons) => respons.status)).toEqual([403, 403, 403, 403]);
  });
});
