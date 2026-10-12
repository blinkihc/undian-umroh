import 'server-only';

import { getEnv } from '@/config/env';
import { getDb } from '@/server/db';
import { getLogger } from '@/server/logger';

export type StatusKesehatan = {
  status: 'ok' | 'gagal';
  db: 'ok' | 'gagal';
  versi: string;
};

/**
 * Status aplikasi dan database untuk `/api/health` (OBSERVABILITY). Tanpa data sensitif.
 * `pingDb` dapat diganti pada tes untuk mensimulasikan database yang mati.
 */
export async function cekKesehatan(
  pingDb: () => Promise<unknown> = () => getDb().$queryRaw`SELECT 1`,
): Promise<StatusKesehatan> {
  const versi = getEnv().NEXT_PUBLIC_APP_VERSION;
  try {
    await pingDb();
    return { status: 'ok', db: 'ok', versi };
  } catch (error) {
    getLogger().error({ err: error }, 'health check: database tidak dapat dijangkau');
    return { status: 'gagal', db: 'gagal', versi };
  }
}
