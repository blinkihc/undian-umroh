import 'server-only';

import { PrismaPg } from '@prisma/adapter-pg';

import { getEnv } from '@/config/env';
import { PrismaClient, type Prisma } from '@/generated/prisma/client';

/** Klien yang boleh dipakai di dalam maupun di luar transaksi (PrismaClient memenuhi tipe ini). */
export type DbClient = Prisma.TransactionClient;

const globalPrisma = globalThis as typeof globalThis & { __prismaUndian?: PrismaClient };

/**
 * Klien Prisma tunggal per proses. Dibuat saat pertama dipakai (bukan saat modul dimuat) agar
 * `next build` tidak butuh DATABASE_URL, dan disimpan di globalThis agar HMR tidak membuka
 * koneksi baru.
 */
export function getDb(): PrismaClient {
  globalPrisma.__prismaUndian ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: getEnv().DATABASE_URL }),
  });
  return globalPrisma.__prismaUndian;
}

/** Menutup koneksi bila sudah dibuka. Untuk skrip (seed) dan tes agar proses dapat selesai. */
export async function tutupDb(): Promise<void> {
  const klien = globalPrisma.__prismaUndian;
  if (klien !== undefined) {
    delete globalPrisma.__prismaUndian;
    await klien.$disconnect();
  }
}
