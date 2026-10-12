import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/periode/[id]/impor/route';
import type * as ModulAudit from '@/server/audit';
import { getDb, tutupDb } from '@/server/db';
import { getLimiterGagal } from '@/server/rate-limit';

import { csvSintetis } from '../../scripts/lib/data-sintetis';
import { buatRequest, masuk } from './helpers/aplikasi';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';
import { buatPengguna } from './helpers/pengguna';

const kendali = vi.hoisted(() => ({ gagalkan: false }));

// Mensimulasikan proses yang terputus setelah semua peserta baru tertulis (langkah terakhir
// transaksi impor adalah audit).
vi.mock('@/server/audit', async (asli) => {
  const modul = await asli<typeof ModulAudit>();
  return {
    ...modul,
    audit: async (...args: Parameters<typeof modul.audit>): Promise<void> => {
      if (kendali.gagalkan && args[1].aksi === 'IMPOR_BERHASIL') {
        throw new Error('simulasi server berhenti di tengah impor');
      }
      await modul.audit(...args);
    },
  };
});

describe('impor terputus', () => {
  let cookie = '';
  let periode: { id: string; version: number };

  async function impor(rows: number, version: number): Promise<Response> {
    const form = new FormData();
    form.set(
      'file',
      new File([csvSintetis({ rows, seed: rows })], 'data.csv', { type: 'text/csv' }),
    );
    form.set('version', String(version));
    return POST(buatRequest(`/api/periode/${periode.id}/impor`, { multipart: form, cookie }), {
      params: Promise.resolve({ id: periode.id }),
    });
  }

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

  it('tidak meninggalkan data setengah jadi; data lama dan version tetap utuh', async () => {
    expect((await impor(20, 1)).status).toBe(200);
    kendali.gagalkan = true;

    const respons = await impor(2500, 2);
    kendali.gagalkan = false;

    expect(respons.status).toBe(500);
    const db = getDb();
    expect(await db.peserta.count({ where: { periodeId: periode.id } })).toBe(20);
    expect(await db.impor.count({ where: { periodeId: periode.id } })).toBe(1);
    expect(await db.impor.count({ where: { periodeId: periode.id, aktif: true } })).toBe(1);
    expect((await db.periode.findUniqueOrThrow({ where: { id: periode.id } })).version).toBe(2);
  });
});
