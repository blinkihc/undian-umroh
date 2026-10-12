import { randomBytes } from 'node:crypto';

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/audit/route';
import { audit } from '@/server/audit';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { buatRequest, masuk } from './helpers/aplikasi';
import { buatPengguna } from './helpers/pengguna';

type Halaman = {
  items: {
    id: number;
    at: string;
    aktor: string;
    aksi: string;
    targetTipe: string;
    targetId: string | null;
    payload: unknown;
    ip: string | null;
  }[];
  page: number;
  pageSize: number;
  total: number;
};

async function cookieAdmin(): Promise<string> {
  const admin = await buatPengguna({ peran: 'ADMIN' });
  const { cookie } = await masuk(admin.username, admin.password);
  return cookie ?? '';
}

async function ambil(cookie: string, query: Record<string, string>): Promise<Response> {
  return GET(buatRequest(`/api/audit?${new URLSearchParams(query).toString()}`, { cookie }));
}

/** Menulis baris audit uji lewat fungsi `audit()` yang sama dengan service sungguhan. */
async function tulisAudit(entri: {
  aktorLabel: string;
  aksi: 'PERIODE_BUAT' | 'IMPOR_BERHASIL' | 'PENGGUNA_BUAT';
  targetId: string;
  payload?: Record<string, string | number>;
}): Promise<void> {
  await getDb().$transaction(async (tx) => {
    await audit(tx, {
      aksi: entri.aksi,
      aktorLabel: entri.aktorLabel,
      targetTipe: 'uji',
      targetId: entri.targetId,
      payload: entri.payload ?? {},
      konteks: { ip: '198.51.100.7', userAgent: 'UjiAgent' },
    });
  });
}

beforeEach(() => {
  getLimiterGagal('login').resetSemua();
});

afterAll(async () => {
  await tutupDb();
});

describe('GET /api/audit', () => {
  it('mengembalikan baris terbaru dulu dengan waktu WIB, aktor, target, payload, dan IP', async () => {
    const cookie = await cookieAdmin();
    const aktor = `aktor-${randomBytes(4).toString('hex')}`;
    await tulisAudit({
      aktorLabel: aktor,
      aksi: 'PERIODE_BUAT',
      targetId: 'p1',
      payload: { judul: 'Uji' },
    });
    await tulisAudit({
      aktorLabel: aktor,
      aksi: 'IMPOR_BERHASIL',
      targetId: 'p1',
      payload: { jumlahBaris: 3 },
    });

    const respons = await ambil(cookie, { aktor });

    expect(respons.status).toBe(200);
    expect(respons.headers.get('Cache-Control')).toBe('no-store');
    const halaman = (await respons.json()) as Halaman;
    expect(halaman).toMatchObject({ page: 1, pageSize: 50, total: 2 });
    expect(halaman.items.map((b) => b.aksi)).toEqual(['IMPOR_BERHASIL', 'PERIODE_BUAT']);
    expect(halaman.items[0]).toMatchObject({
      aktor,
      targetTipe: 'uji',
      targetId: 'p1',
      payload: { jumlahBaris: 3 },
      ip: '198.51.100.7',
    });
    expect(halaman.items[0]?.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/);
  });

  it('memfilter menurut aksi dan bagian username aktor tanpa memandang huruf besar-kecil', async () => {
    const cookie = await cookieAdmin();
    const awalan = `cari-${randomBytes(4).toString('hex')}`;
    await tulisAudit({ aktorLabel: `${awalan}.satu`, aksi: 'PERIODE_BUAT', targetId: 'a' });
    await tulisAudit({ aktorLabel: `${awalan}.dua`, aksi: 'IMPOR_BERHASIL', targetId: 'b' });

    const menurutAktor = (await (
      await ambil(cookie, { aktor: awalan.toUpperCase() })
    ).json()) as Halaman;
    const menurutAksi = (await (
      await ambil(cookie, { aktor: awalan, aksi: 'IMPOR_BERHASIL' })
    ).json()) as Halaman;

    expect(menurutAktor.total).toBe(2);
    expect(menurutAksi.items.map((b) => b.aktor)).toEqual([`${awalan}.dua`]);
  });

  it('memfilter rentang tanggal WIB secara inklusif di kedua batas', async () => {
    const cookie = await cookieAdmin();
    const aktor = `tgl-${randomBytes(4).toString('hex')}`;
    // 30/09 23:59:59 WIB, 01/10 00:00:00 WIB, 02/10 23:59:59 WIB, 03/10 00:00:00 WIB.
    for (const at of [
      '2026-09-30T16:59:59Z',
      '2026-09-30T17:00:00Z',
      '2026-10-02T16:59:59Z',
      '2026-10-02T17:00:00Z',
    ]) {
      await getDb().$executeRaw`INSERT INTO audit_log (at, aktor_label, aksi, target_tipe, payload)
        VALUES (${new Date(at)}, ${aktor}, 'PERIODE_UBAH', 'uji', '{}')`;
    }

    const halaman = (await (
      await ambil(cookie, { aktor, dari: '2026-10-01', sampai: '2026-10-02' })
    ).json()) as Halaman;

    expect(halaman.items.map((b) => b.at)).toEqual([
      '2026-10-02T23:59:59+07:00',
      '2026-10-01T00:00:00+07:00',
    ]);
  });

  it('memaginasi dengan total yang benar', async () => {
    const cookie = await cookieAdmin();
    const aktor = `hal-${randomBytes(4).toString('hex')}`;
    for (let i = 0; i < 5; i++) {
      await tulisAudit({ aktorLabel: aktor, aksi: 'PERIODE_BUAT', targetId: `t${i.toString()}` });
    }

    const kedua = (await (
      await ambil(cookie, { aktor, page: '2', pageSize: '2' })
    ).json()) as Halaman;
    const ketiga = (await (
      await ambil(cookie, { aktor, page: '3', pageSize: '2' })
    ).json()) as Halaman;

    expect(kedua).toMatchObject({ page: 2, pageSize: 2, total: 5 });
    expect(kedua.items).toHaveLength(2);
    expect(ketiga.items).toHaveLength(1);
    expect(kedua.items.map((b) => b.targetId)).toEqual(['t2', 't1']);
  });

  it('menolak filter tidak valid dengan 400', async () => {
    const cookie = await cookieAdmin();

    const respons = await ambil(cookie, { aksi: 'HAPUS_SEMUA', pageSize: '500' });

    expect(respons.status).toBe(400);
    const isi = (await respons.json()) as {
      error: { details: { fields: Record<string, string> } };
    };
    expect(Object.keys(isi.error.details.fields).sort()).toEqual(['aksi', 'pageSize']);
  });

  it('tidak pernah menyimpan kata sandi, token, atau NIK di payload walau pemanggil keliru', async () => {
    const cookie = await cookieAdmin();
    const aktor = `bocor-${randomBytes(4).toString('hex')}`;
    await tulisAudit({
      aktorLabel: aktor,
      aksi: 'PENGGUNA_BUAT',
      targetId: 'x',
      payload: {
        username: 'operator1',
        passwordAwal: 'rahasia-sekali-1',
        token: 'abc',
        nik: '1609999999990001',
        catatan: 'NIK 1609999999990001',
      },
    });

    const halaman = (await (await ambil(cookie, { aktor })).json()) as Halaman;

    expect(halaman.items[0]?.payload).toEqual({ username: 'operator1', catatan: '[DISAMARKAN]' });
    const mentah = await getDb().auditLog.findFirstOrThrow({ where: { aktorLabel: aktor } });
    expect(JSON.stringify(mentah.payload)).not.toMatch(/rahasia-sekali|1609999999990001|abc/);
  });

  it('Operator ditolak 403 dan tanpa sesi 401', async () => {
    const operator = await buatPengguna({ peran: 'OPERATOR' });
    const { cookie } = await masuk(operator.username, operator.password);

    expect((await ambil(cookie ?? '', {})).status).toBe(403);
    expect((await GET(buatRequest('/api/audit'))).status).toBe(401);
  });
});
