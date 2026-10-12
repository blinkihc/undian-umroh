import 'server-only';

import { isIP } from 'node:net';

import { type Prisma } from '@/generated/prisma/client';
import { type AksiAudit } from '@/lib/domain';

import { type DbClient } from './db';
import { type KonteksRequest } from './request';

const UKURAN_USER_AGENT_MAKS = 256;

export type EntriAudit = {
  aksi: AksiAudit;
  /** Pelaku. Kosong untuk aksi tanpa pengguna terautentikasi (login gagal, publik, sistem). */
  aktor?: { id: string; username: string };
  /** Dipakai bila `aktor` kosong: username yang dicoba, `publik`, atau `sistem`. */
  aktorLabel?: string;
  targetTipe: string;
  targetId?: string;
  /** Ringkasan dan ID saja. Dilarang memuat NIK, kata sandi, atau token (DATABASE §9). */
  payload?: Prisma.InputJsonObject;
  konteks?: KonteksRequest;
};

/**
 * Menulis satu baris audit. Selalu panggil dengan klien transaksi yang sama dengan perubahan
 * datanya (`getDb().$transaction(async (tx) => { ...; await audit(tx, ...) })`) supaya audit dan
 * data berhasil atau gagal bersama (ARCHITECTURE §8).
 */
export async function audit(db: DbClient, entri: EntriAudit): Promise<void> {
  const ip = entri.konteks?.ip ?? null;
  await db.auditLog.create({
    data: {
      aksi: entri.aksi,
      aktorId: entri.aktor?.id ?? null,
      aktorLabel: entri.aktor?.username ?? entri.aktorLabel ?? 'sistem',
      targetTipe: entri.targetTipe,
      targetId: entri.targetId ?? null,
      payload: entri.payload ?? {},
      // Kolom inet menolak teks bukan IP; nilai yang tidak sah dibuang, bukan membuat audit gagal.
      ip: ip !== null && isIP(ip) !== 0 ? ip : null,
      userAgent: entri.konteks?.userAgent?.slice(0, UKURAN_USER_AGENT_MAKS) ?? null,
    },
  });
}
