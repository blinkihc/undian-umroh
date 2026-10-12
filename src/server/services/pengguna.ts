import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import {
  PESAN_PASSWORD_DITOLAK,
  PESAN_UBAH_DITOLAK,
  USERNAME_POLA,
  isoWib,
  periksaPasswordBaru,
  periksaUbahPengguna,
  type BuatPengguna,
  type UbahPengguna,
} from '@/lib/domain';
import { audit } from '@/server/audit';
import { hashPassword } from '@/server/auth/password';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb, type DbClient } from '@/server/db';
import { AppError, galatValidasi } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';

/** Bentuk akun di API dan halaman Pengguna (tanpa hash kata sandi). */
export type PenggunaApi = {
  id: string;
  username: string;
  nama: string;
  peran: 'ADMIN' | 'OPERATOR';
  aktif: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  version: number;
};

const PILIH_PENGGUNA = {
  id: true,
  username: true,
  nama: true,
  peran: true,
  aktif: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  version: true,
} as const satisfies Prisma.PenggunaSelect;

type BarisPengguna = Prisma.PenggunaGetPayload<{ select: typeof PILIH_PENGGUNA }>;

function keApi(baris: BarisPengguna): PenggunaApi {
  return {
    ...baris,
    lastLoginAt: baris.lastLoginAt === null ? null : isoWib(baris.lastLoginAt),
    createdAt: isoWib(baris.createdAt),
  };
}

function aktorAudit(pengguna: PenggunaSesi): { id: string; username: string } {
  return { id: pengguna.id, username: pengguna.username };
}

/**
 * Kunci transaksi untuk aturan "minimal satu Admin aktif": dua Admin yang saling menonaktifkan
 * bersamaan tidak boleh sama-sama lolos pemeriksaan jumlah.
 */
async function kunciAturanAdmin(tx: DbClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('pengguna:admin-aktif'))`;
}

/** Semua akun, Admin dulu lalu menurut username (UX_FLOWS Flow 16). */
export async function daftarPengguna(): Promise<PenggunaApi[]> {
  const baris = await getDb().pengguna.findMany({
    select: PILIH_PENGGUNA,
    orderBy: [{ peran: 'asc' }, { username: 'asc' }],
  });
  return baris.map(keApi);
}

/**
 * Membuat akun baru oleh Admin. Akun baru wajib ganti kata sandi saat login pertama (SECURITY §1).
 * Username ganda menghasilkan 409 dengan pesan di field username.
 */
export async function buatPenggunaBaru(masukan: {
  aktor: PenggunaSesi;
  data: BuatPengguna;
  konteks: KonteksRequest;
}): Promise<PenggunaApi> {
  const { aktor, data, konteks } = masukan;
  const aturan = periksaPasswordBaru({ passwordBaru: data.passwordAwal, username: data.username });
  if (!aturan.ok) {
    throw galatValidasi({ passwordAwal: PESAN_PASSWORD_DITOLAK[aturan.error] });
  }
  const passwordHash = await hashPassword(data.passwordAwal);
  try {
    return await getDb().$transaction(async (tx) => {
      const baru = await tx.pengguna.create({
        data: {
          username: data.username,
          nama: data.nama,
          peran: data.peran,
          passwordHash,
          mustChangePassword: true,
        },
        select: PILIH_PENGGUNA,
      });
      await audit(tx, {
        aksi: 'PENGGUNA_BUAT',
        aktor: aktorAudit(aktor),
        targetTipe: 'pengguna',
        targetId: baru.id,
        payload: { username: baru.username, nama: baru.nama, peran: baru.peran },
        konteks,
      });
      return keApi(baru);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('USERNAME_SUDAH_DIPAKAI', 409, 'Username sudah dipakai.', {
        fields: { username: 'Username sudah dipakai. Pilih username lain.' },
      });
    }
    throw error;
  }
}

/**
 * Mengubah akun: aktifkan/nonaktifkan, reset kata sandi (memaksa ganti saat login berikutnya),
 * atau ubah peran. Aturan diri sendiri dan Admin terakhir diperiksa di dalam transaksi berkunci;
 * `version` basi menghasilkan 409. Perubahan tanpa efek (mis. mengaktifkan akun yang sudah aktif)
 * tidak menulis apa pun.
 */
export async function ubahPengguna(masukan: {
  aktor: PenggunaSesi;
  id: string;
  perubahan: UbahPengguna;
  konteks: KonteksRequest;
}): Promise<PenggunaApi> {
  const { aktor, id, perubahan, konteks } = masukan;
  const db = getDb();

  const passwordHash =
    'resetPassword' in perubahan ? await siapkanResetPassword(id, perubahan.resetPassword) : null;

  return db.$transaction(async (tx) => {
    await kunciAturanAdmin(tx);
    const target = await tx.pengguna.findUnique({ where: { id }, select: PILIH_PENGGUNA });
    if (target === null) {
      throw new AppError('TIDAK_DITEMUKAN', 404, 'Akun tidak ditemukan.');
    }
    if (target.version !== perubahan.version) {
      throw new AppError(
        'CONFLICT',
        409,
        'Akun ini baru saja diubah orang lain. Muat ulang lalu coba lagi.',
        { version: target.version },
      );
    }

    const jumlahAdminAktif = await tx.pengguna.count({ where: { peran: 'ADMIN', aktif: true } });
    const aturan = periksaUbahPengguna({
      aktorId: aktor.id,
      target,
      perubahan: {
        ...('aktif' in perubahan && { aktif: perubahan.aktif }),
        ...('peran' in perubahan && { peran: perubahan.peran }),
      },
      jumlahAdminAktif,
    });
    if (!aturan.ok) {
      throw new AppError('PERUBAHAN_AKUN_DITOLAK', 422, PESAN_UBAH_DITOLAK[aturan.error], {
        alasan: aturan.error,
      });
    }

    const rencana = rencanaPerubahan(target, perubahan, passwordHash);
    if (rencana === null) {
      return keApi(target);
    }
    const hasil = await tx.pengguna.update({
      where: { id },
      data: { ...rencana.data, version: { increment: 1 } },
      select: PILIH_PENGGUNA,
    });
    await audit(tx, {
      aksi: rencana.aksi,
      aktor: aktorAudit(aktor),
      targetTipe: 'pengguna',
      targetId: id,
      payload: { username: target.username, ...rencana.payload },
      konteks,
    });
    return keApi(hasil);
  });
}

/** Memeriksa aturan kata sandi reset terhadap username target, lalu membuat hash-nya. */
async function siapkanResetPassword(id: string, password: string): Promise<string> {
  const target = await getDb().pengguna.findUnique({ where: { id }, select: { username: true } });
  if (target === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Akun tidak ditemukan.');
  }
  const aturan = periksaPasswordBaru({ passwordBaru: password, username: target.username });
  if (!aturan.ok) {
    throw galatValidasi({ resetPassword: PESAN_PASSWORD_DITOLAK[aturan.error] });
  }
  return hashPassword(password);
}

type Rencana = {
  aksi: 'PENGGUNA_AKTIFKAN' | 'PENGGUNA_NONAKTIFKAN' | 'PENGGUNA_RESET_PASSWORD' | 'PENGGUNA_UBAH';
  data: Prisma.PenggunaUpdateInput;
  payload: Prisma.InputJsonObject;
};

function rencanaPerubahan(
  target: BarisPengguna,
  perubahan: UbahPengguna,
  passwordHash: string | null,
): Rencana | null {
  if ('aktif' in perubahan) {
    if (perubahan.aktif === target.aktif) {
      return null;
    }
    return {
      aksi: perubahan.aktif ? 'PENGGUNA_AKTIFKAN' : 'PENGGUNA_NONAKTIFKAN',
      data: { aktif: perubahan.aktif },
      payload: {},
    };
  }
  if ('peran' in perubahan) {
    if (perubahan.peran === target.peran) {
      return null;
    }
    return {
      aksi: 'PENGGUNA_UBAH',
      data: { peran: perubahan.peran },
      payload: { peranLama: target.peran, peranBaru: perubahan.peran },
    };
  }
  // Reset kata sandi: kata sandi sementara tidak pernah masuk payload audit.
  return {
    aksi: 'PENGGUNA_RESET_PASSWORD',
    data: { passwordHash: passwordHash ?? '', mustChangePassword: true },
    payload: {},
  };
}

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
