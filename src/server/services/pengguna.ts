import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import { PESAN_PASSWORD_DITOLAK, USERNAME_POLA, periksaPasswordBaru } from '@/lib/domain';
import { audit } from '@/server/audit';
import { hashPassword } from '@/server/auth/password';
import { getDb } from '@/server/db';

/**
 * Membuat akun Admin pertama dari env seed bila belum ada (SECURITY §1, DATABASE §12).
 * Idempoten: bila username sudah ada, tidak ada yang diubah, termasuk kata sandinya.
 * Akun baru wajib ganti kata sandi saat login pertama.
 */
export async function pastikanAdminAwal(masukan: {
  username: string;
  password: string;
}): Promise<'dibuat' | 'sudah-ada'> {
  const username = masukan.username.trim().toLowerCase();
  if (!USERNAME_POLA.test(username)) {
    throw new Error(
      'SEED_ADMIN_USERNAME tidak valid: gunakan 3-32 karakter huruf kecil, angka, titik, garis bawah, atau strip.',
    );
  }
  const aturan = periksaPasswordBaru({ passwordBaru: masukan.password, username });
  if (!aturan.ok) {
    throw new Error(`SEED_ADMIN_PASSWORD ditolak: ${PESAN_PASSWORD_DITOLAK[aturan.error]}`);
  }

  const db = getDb();
  const ada = await db.pengguna.findUnique({ where: { username }, select: { id: true } });
  if (ada !== null) {
    return 'sudah-ada';
  }

  const passwordHash = await hashPassword(masukan.password);
  try {
    await db.$transaction(async (tx) => {
      const baru = await tx.pengguna.create({
        data: { username, nama: 'Admin Bapenda', passwordHash, peran: 'ADMIN' },
      });
      await audit(tx, {
        aksi: 'PENGGUNA_BUAT',
        aktorLabel: 'sistem',
        targetTipe: 'pengguna',
        targetId: baru.id,
        payload: { username, peran: 'ADMIN', sumber: 'seed' },
      });
    });
  } catch (error) {
    // Dua seed berjalan bersamaan: yang kalah balapan dianggap sudah ada.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return 'sudah-ada';
    }
    throw error;
  }
  return 'dibuat';
}
