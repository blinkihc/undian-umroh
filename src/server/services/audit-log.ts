import 'server-only';

import { type Prisma } from '@/generated/prisma/client';
import { isoWib, rentangTanggalWib, type FilterAudit } from '@/lib/domain';
import { getDb } from '@/server/db';

/** Satu baris log audit di API dan halaman Log Audit (API.md, Pengguna & Audit). */
export type BarisAuditApi = {
  id: number;
  at: string;
  aktor: string;
  aksi: string;
  targetTipe: string;
  targetId: string | null;
  payload: unknown;
  ip: string | null;
};

export type HalamanAudit = {
  items: BarisAuditApi[];
  page: number;
  pageSize: number;
  total: number;
};

function kondisi(filter: FilterAudit): Prisma.AuditLogWhereInput {
  const rentang = rentangTanggalWib(filter);
  return {
    ...(filter.aksi !== undefined && { aksi: filter.aksi }),
    ...(filter.aktor !== undefined && {
      aktorLabel: { contains: filter.aktor, mode: 'insensitive' },
    }),
    ...((rentang.gte !== undefined || rentang.lt !== undefined) && { at: rentang }),
  };
}

/**
 * Log audit terbaru dulu, dengan filter aksi, aktor (bagian username), dan rentang tanggal WIB
 * inklusif. Hanya membaca; tabel ini append-only (DATABASE §7).
 */
export async function daftarAudit(filter: FilterAudit): Promise<HalamanAudit> {
  const db = getDb();
  const where = kondisi(filter);
  const [total, baris] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: [{ at: 'desc' }, { id: 'desc' }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      select: {
        id: true,
        at: true,
        aktorLabel: true,
        aksi: true,
        targetTipe: true,
        targetId: true,
        payload: true,
        ip: true,
      },
    }),
  ]);
  return {
    items: baris.map((b) => ({
      id: Number(b.id),
      at: isoWib(b.at),
      aktor: b.aktorLabel,
      aksi: b.aksi,
      targetTipe: b.targetTipe,
      targetId: b.targetId,
      payload: b.payload,
      ip: b.ip,
    })),
    page: filter.page,
    pageSize: filter.pageSize,
    total,
  };
}

/** Label aktor yang pernah tercatat, untuk saran isian filter. */
export async function daftarLabelAktor(): Promise<string[]> {
  const baris = await getDb().auditLog.findMany({
    distinct: ['aktorLabel'],
    select: { aktorLabel: true },
    orderBy: { aktorLabel: 'asc' },
    take: 200,
  });
  return baris.map((b) => b.aktorLabel);
}
