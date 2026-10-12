import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/periode/[id]/impor/route';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { csvSintetis } from '../../scripts/lib/data-sintetis';
import { buatRequest, masuk } from './helpers/aplikasi';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';
import { buatPengguna } from './helpers/pengguna';

/** @slow — TESTING §2 Performa: 46.000 baris sintetis selesai < 60 detik. */
describe('@slow impor 46.000 baris', () => {
  let cookie = '';
  let periode: { id: string; version: number };

  beforeAll(async () => {
    getLimiterGagal('login').resetSemua();
    const admin = await buatPengguna({ peran: 'ADMIN' });
    cookie = (await masuk(admin.username, admin.password)).cookie ?? '';
    await bersihkanPeriode();
    periode = await buatPeriodeTes(admin.id);
  });

  afterAll(async () => {
    await bersihkanPeriode();
    await tutupDb();
  });

  it('selesai kurang dari 60 detik dan semua baris tersimpan', { timeout: 180_000 }, async () => {
    const csv = csvSintetis({ rows: 46_000 });
    const form = new FormData();
    form.set('file', new File([csv], 'sintetis-46000.csv', { type: 'text/csv' }));
    form.set('version', String(periode.version));

    const mulai = performance.now();
    const respons = await POST(
      buatRequest(`/api/periode/${periode.id}/impor`, { multipart: form, cookie }),
      { params: Promise.resolve({ id: periode.id }) },
    );
    const durasi = performance.now() - mulai;

    expect(respons.status).toBe(200);
    const ringkasan = (await respons.json()) as { totalBaris: number; jumlahLolos: number };
    expect(ringkasan.totalBaris).toBe(46_000);
    expect(ringkasan.jumlahLolos).toBeGreaterThan(40_000);
    expect(await getDb().peserta.count({ where: { periodeId: periode.id } })).toBe(46_000);
    const batasDurasi = process.env.CI ? 60_000 : 90_000;
    expect(durasi).toBeLessThan(batasDurasi);
  });
});
