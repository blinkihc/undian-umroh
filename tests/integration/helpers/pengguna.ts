import { randomBytes } from 'node:crypto';

import { type Peran } from '@/generated/prisma/client';
import { hashPassword } from '@/server/auth/password';
import { getDb } from '@/server/db';

export const PASSWORD_TES = 'kata-sandi-uji-12345';

export type PenggunaTes = {
  id: string;
  username: string;
  password: string;
};

/**
 * Membuat akun uji dengan username unik. Tabel audit_log immutable dan menunjuk ke pengguna,
 * jadi tes tidak menghapus akun; username acak menjaga tes tetap terisolasi satu sama lain.
 */
export async function buatPengguna(
  opsi: {
    peran?: Peran;
    aktif?: boolean;
    mustChangePassword?: boolean;
    password?: string;
  } = {},
): Promise<PenggunaTes> {
  const username = `uji-${randomBytes(6).toString('hex')}`;
  const password = opsi.password ?? PASSWORD_TES;
  const pengguna = await getDb().pengguna.create({
    data: {
      username,
      nama: `Pengguna ${username}`,
      passwordHash: await hashPassword(password),
      peran: opsi.peran ?? 'ADMIN',
      aktif: opsi.aktif ?? true,
      mustChangePassword: opsi.mustChangePassword ?? false,
    },
  });
  return { id: pengguna.id, username, password };
}

/** Baris audit untuk satu target (atau aktor), terurut dari yang tertua. */
export async function auditUntuk(filter: {
  aktorLabel?: string;
  targetId?: string;
  aksi?: string;
}): Promise<
  {
    aksi: string;
    aktorLabel: string;
    aktorId: string | null;
    payload: unknown;
    ip: string | null;
  }[]
> {
  return getDb().auditLog.findMany({
    where: filter,
    orderBy: { id: 'asc' },
    select: { aksi: true, aktorLabel: true, aktorId: true, payload: true, ip: true },
  });
}
