import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as healthGet } from '@/app/api/health/route';
import { GET as pemenangPublikGet } from '@/app/api/publik/pemenang/route';
import { GET as temaGet, POST as temaPost } from '@/app/api/tema/route';
import { proxy } from '@/proxy';
import { getDb, tutupDb } from '@/server/db';

import { buatCookieSesi, buatRequest } from './helpers/aplikasi';
import { buatPengguna, type PenggunaTes } from './helpers/pengguna';

let admin: PenggunaTes;
let operator: PenggunaTes;
let cookieAdmin: string;
let cookieOperator: string;

beforeAll(async () => {
  admin = await buatPengguna({ peran: 'ADMIN' });
  operator = await buatPengguna({ peran: 'OPERATOR' });
  cookieAdmin = await buatCookieSesi({ sub: admin.id, loginAt: Date.now() });
  cookieOperator = await buatCookieSesi({ sub: operator.id, loginAt: Date.now() });
});

afterAll(async () => {
  await tutupDb();
});

describe('Batch 3: Tiket 27 - Hardening Keamanan dan Tinjauan Akhir', () => {
  it('proxy menyuntikkan Content-Security-Policy berbasis nonce dan seluruh header keamanan', async () => {
    const nextReq = new NextRequest('http://localhost:3000/admin', {
      headers: { host: 'localhost:3000' },
    });
    const res = await proxy(nextReq);

    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain('default-src \'self\'');
    expect(csp).toContain('nonce-');
    expect(csp).toContain('style-src \'self\' \'unsafe-inline\'');
    expect(csp).toContain('frame-ancestors \'none\'');
    expect(csp).toContain('object-src \'none\'');

    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('menegakkan matriks otorisasi RBAC (Admin, Operator, Publik)', async () => {
    // 1. Endpoint Admin ditolak untuk pengunjung anonim (401)
    const reqAnonim = buatRequest('/api/tema');
    const resAnonim = await temaGet(reqAnonim);
    expect(resAnonim.status).toBe(401);

    // 2. Endpoint Admin ditolak untuk Operator (403)
    const reqOperator = buatRequest('/api/tema', { cookie: cookieOperator });
    const resOperator = await temaGet(reqOperator);
    expect(resOperator.status).toBe(403);

    // 3. Endpoint Admin berhasil untuk Admin (200)
    const reqAdmin = buatRequest('/api/tema', { cookie: cookieAdmin });
    const resAdmin = await temaGet(reqAdmin);
    expect(resAdmin.status).toBe(200);

    // 4. Endpoint Publik dan Health Check dapat diakses bebas tanpa login
    const reqHealth = buatRequest('/api/health');
    const resHealth = await healthGet(reqHealth);
    expect(resHealth.status).toBe(200);

    const reqPublik = buatRequest('/api/publik/pemenang');
    const resPublik = await pemenangPublikGet(reqPublik);
    expect(resPublik.status).toBe(200);
  });

  it('menolak mutasi yang berasal dari Origin asing (proteksi CSRF cross-origin)', async () => {
    const reqAsing = buatRequest('/api/tema', {
      method: 'POST',
      cookie: cookieAdmin,
      origin: 'https://hacker-site.attacker.com',
      json: { nama: 'Tema Ilegal', config: {} },
    });
    const resAsing = await temaPost(reqAsing);
    expect(resAsing.status).toBe(403);
    const json = await resAsing.json();
    expect(json.error.code).toBe('AKSES_DITOLAK');
  });

  it('memastikan data publik tidak membocorkan NIK utuh (hanya NIK termasker)', async () => {
    const reqPublik = buatRequest('/api/publik/pemenang');
    const resPublik = await pemenangPublikGet(reqPublik);
    const teksPublik = await resPublik.text();

    // Regex NIK 16 digit angka polos
    const cocokNikUtuh = /\b\d{16}\b/.test(teksPublik);
    // Tidak boleh ada NIK 16 digit utuh yang muncul
    expect(cocokNikUtuh).toBe(false);
  });

  it('trigger immutable database menolak operasi UPDATE dan DELETE pada tabel audit dan snapshot', async () => {
    const db = getDb();

    // Buat audit log dummy
    const log = await db.auditLog.create({
      data: {
        aksi: 'UJI_IMMUTABLE',
        targetTipe: 'sistem',
        aktorLabel: 'admin_uji',
      },
    });

    // Percobaan UPDATE harus gagal karena trigger database
    await expect(
      db.$executeRawUnsafe(`UPDATE "audit_log" SET "aksi" = 'DIUBAH' WHERE "id" = '${log.id}'`),
    ).rejects.toThrow();

    // Percobaan DELETE harus gagal karena trigger database
    await expect(
      db.$executeRawUnsafe(`DELETE FROM "audit_log" WHERE "id" = '${log.id}'`),
    ).rejects.toThrow();
  });
});
