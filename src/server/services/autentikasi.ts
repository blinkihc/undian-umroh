import 'server-only';

import {
  PESAN_LOGIN_DIBLOKIR,
  PESAN_PASSWORD_DITOLAK,
  USERNAME_POLA,
  periksaPasswordBaru,
} from '@/lib/domain';
import { audit } from '@/server/audit';
import { hashPassword, verifyPassword, verifyPasswordPalsu } from '@/server/auth/password';
import { getDb } from '@/server/db';
import { AppError, galatValidasi } from '@/server/errors';
import { getLogger } from '@/server/logger';
import { getLimiterGagal } from '@/server/rate-limit';
import { hashIpHarian, type KonteksRequest } from '@/server/request';

export type PenggunaLogin = { id: string; username: string };

/** Username yang tampil di audit; teks bebas (mungkin kata sandi yang salah ketik) tidak dicatat. */
function labelUsername(username: string): string {
  return USERNAME_POLA.test(username) ? username : '(tidak valid)';
}

function kunciLogin(username: string, konteks: KonteksRequest): string {
  return `${username}|${konteks.ip ?? '-'}`;
}

/**
 * Melempar 429 bila kombinasi username dan IP sedang diblokir (5 gagal / 15 menit, SECURITY §5).
 * Dipanggil lebih dulu oleh route login agar penolakan tidak menunggu verifikasi kata sandi.
 */
export function pastikanLoginTidakDiblokir(username: string, konteks: KonteksRequest): void {
  const status = getLimiterGagal('login').cek(kunciLogin(username, konteks));
  if (status.terblokir) {
    getLogger().warn(
      { username: labelUsername(username), ipHash: hashIpHarian(konteks.ip) },
      'login diblokir sementara',
    );
    throw new AppError('TERLALU_BANYAK_PERMINTAAN', 429, PESAN_LOGIN_DIBLOKIR, {
      retryAfterDetik: status.retryAfterDetik,
    });
  }
}

/**
 * Memverifikasi kredensial (SECURITY §1, §5). Mengembalikan null untuk semua kegagalan
 * (kredensial salah, akun tidak ada, akun nonaktif) supaya pesan ke pengguna selalu sama.
 * Melempar 429 bila kombinasi username dan IP sedang diblokir. Login berhasil dan gagal
 * masing-masing menulis audit dalam transaksi yang sama dengan perubahannya.
 */
export async function masuk(masukan: {
  username: string;
  password: string;
  konteks: KonteksRequest;
}): Promise<PenggunaLogin | null> {
  const { username, password, konteks } = masukan;
  const limiter = getLimiterGagal('login');
  const kunci = kunciLogin(username, konteks);
  pastikanLoginTidakDiblokir(username, konteks);

  const db = getDb();
  const pengguna = await db.pengguna.findUnique({ where: { username } });
  let passwordCocok = false;
  if (pengguna === null) {
    await verifyPasswordPalsu(password);
  } else {
    passwordCocok = await verifyPassword(pengguna.passwordHash, password);
  }

  if (pengguna !== null && passwordCocok && pengguna.aktif) {
    limiter.reset(kunci);
    await db.$transaction(async (tx) => {
      await tx.pengguna.update({ where: { id: pengguna.id }, data: { lastLoginAt: new Date() } });
      await audit(tx, {
        aksi: 'LOGIN_BERHASIL',
        aktor: { id: pengguna.id, username: pengguna.username },
        targetTipe: 'pengguna',
        targetId: pengguna.id,
        konteks,
      });
    });
    return { id: pengguna.id, username: pengguna.username };
  }

  const alasan = pengguna !== null && passwordCocok ? 'AKUN_NONAKTIF' : 'KREDENSIAL_SALAH';
  const { terblokirSekarang } = limiter.catatGagal(kunci);
  await db.$transaction(async (tx) => {
    await audit(tx, {
      aksi: 'LOGIN_GAGAL',
      aktorLabel: labelUsername(username),
      targetTipe: 'pengguna',
      targetId: pengguna?.id,
      payload: { alasan },
      konteks,
    });
    if (terblokirSekarang) {
      await audit(tx, {
        aksi: 'LOGIN_DIBLOKIR',
        aktorLabel: labelUsername(username),
        targetTipe: 'pengguna',
        payload: { durasiMenit: 15 },
        konteks,
      });
    }
  });
  getLogger().warn(
    { username: labelUsername(username), ipHash: hashIpHarian(konteks.ip), alasan },
    'login gagal',
  );
  return null;
}

/**
 * Mengganti kata sandi sendiri (SECURITY §1). Wajib kata sandi lama yang benar; kesalahan
 * beruntun dibatasi sama seperti login agar sesi curian tidak dapat menebak kata sandi lama.
 */
export async function gantiPassword(masukan: {
  penggunaId: string;
  passwordLama: string;
  passwordBaru: string;
  konteks: KonteksRequest;
}): Promise<void> {
  const { penggunaId, passwordLama, passwordBaru, konteks } = masukan;
  const limiter = getLimiterGagal('ganti-password');

  const status = limiter.cek(penggunaId);
  if (status.terblokir) {
    throw new AppError('TERLALU_BANYAK_PERMINTAAN', 429, PESAN_LOGIN_DIBLOKIR, {
      retryAfterDetik: status.retryAfterDetik,
    });
  }

  const db = getDb();
  const pengguna = await db.pengguna.findUnique({ where: { id: penggunaId } });
  if (pengguna === null || !pengguna.aktif) {
    throw new AppError('TIDAK_TERAUTENTIKASI', 401, 'Sesi Anda berakhir. Silakan masuk lagi.');
  }

  const aturan = periksaPasswordBaru({ passwordBaru, username: pengguna.username, passwordLama });
  if (!aturan.ok) {
    throw galatValidasi({ passwordBaru: PESAN_PASSWORD_DITOLAK[aturan.error] });
  }

  if (!(await verifyPassword(pengguna.passwordHash, passwordLama))) {
    limiter.catatGagal(penggunaId);
    throw galatValidasi({ passwordLama: 'Kata sandi lama salah.' });
  }
  limiter.reset(penggunaId);

  const passwordHash = await hashPassword(passwordBaru);
  await db.$transaction(async (tx) => {
    await tx.pengguna.update({
      where: { id: pengguna.id },
      data: { passwordHash, mustChangePassword: false },
    });
    await audit(tx, {
      aksi: 'PASSWORD_GANTI',
      aktor: { id: pengguna.id, username: pengguna.username },
      targetTipe: 'pengguna',
      targetId: pengguna.id,
      konteks,
    });
  });
}

/** Mencatat keluar. Auth.js tidak memberi request ke event signOut, jadi IP tidak tersedia. */
export async function catatLogout(penggunaId: string): Promise<void> {
  const db = getDb();
  const pengguna = await db.pengguna.findUnique({
    where: { id: penggunaId },
    select: { id: true, username: true },
  });
  if (pengguna === null) {
    return;
  }
  await db.$transaction(async (tx) => {
    await audit(tx, {
      aksi: 'LOGOUT',
      aktor: pengguna,
      targetTipe: 'pengguna',
      targetId: pengguna.id,
    });
  });
}
