import 'server-only';

import { BATAS_SESI_MUTLAK_MS } from '@/config/sesi';
import { type Peran } from '@/generated/prisma/client';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';

import { bacaTokenSesi } from './token';

/** Pengguna yang sedang masuk, dibaca dari database pada setiap request (SECURITY §1). */
export type PenggunaSesi = {
  id: string;
  username: string;
  nama: string;
  peran: Peran;
  mustChangePassword: boolean;
};

export type OpsiAkses = {
  /** Hanya untuk "ganti kata sandi": akun wajib-ganti tetap boleh mengaksesnya. */
  izinkanGantiPassword?: boolean;
};

/**
 * Pengguna dari cookie sesi, atau null bila tidak ada sesi, sesi lewat 12 jam, akun tidak ada,
 * atau akun nonaktif. Akun nonaktif kehilangan akses seketika karena database dicek tiap kali.
 */
export async function ambilPenggunaDariHeaders(headers: Headers): Promise<PenggunaSesi | null> {
  const token = await bacaTokenSesi(headers);
  if (token === null || Date.now() - token.loginAt > BATAS_SESI_MUTLAK_MS) {
    return null;
  }
  const pengguna = await getDb().pengguna.findUnique({
    where: { id: token.sub },
    select: {
      id: true,
      username: true,
      nama: true,
      peran: true,
      aktif: true,
      mustChangePassword: true,
    },
  });
  if (pengguna === null || !pengguna.aktif) {
    return null;
  }
  const { aktif: _aktif, ...sesi } = pengguna;
  return sesi;
}

/**
 * Wajib untuk setiap endpoint non-publik. Respons 401 sama untuk "tidak ada sesi" dan
 * "akun nonaktif" (SECURITY §5).
 */
export async function requireUser(request: Request, opsi: OpsiAkses = {}): Promise<PenggunaSesi> {
  const pengguna = await ambilPenggunaDariHeaders(request.headers);
  if (pengguna === null) {
    throw new AppError('TIDAK_TERAUTENTIKASI', 401, 'Sesi Anda berakhir. Silakan masuk lagi.');
  }
  if (pengguna.mustChangePassword && opsi.izinkanGantiPassword !== true) {
    throw new AppError(
      'PASSWORD_HARUS_DIGANTI',
      403,
      'Anda harus mengganti kata sandi sebelum melanjutkan.',
    );
  }
  return pengguna;
}

/** Pengguna harus berperan salah satu dari `peran` (matriks RBAC SECURITY §2). */
export async function requireRole(
  request: Request,
  peran: readonly Peran[],
  opsi: OpsiAkses = {},
): Promise<PenggunaSesi> {
  const pengguna = await requireUser(request, opsi);
  if (!peran.includes(pengguna.peran)) {
    throw new AppError('AKSES_DITOLAK', 403, 'Anda tidak memiliki akses ke halaman ini.');
  }
  return pengguna;
}
