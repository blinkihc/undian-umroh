import { randomBytes } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { audit } from '@/server/audit';
import { getDb, tutupDb } from '@/server/db';

import { buatPengguna } from './helpers/pengguna';

afterAll(async () => {
  await tutupDb();
});

async function buatBarisAudit(): Promise<{ id: bigint; targetId: string }> {
  const targetId = `target-${randomBytes(6).toString('hex')}`;
  const baris = await getDb().auditLog.create({
    data: { aksi: 'LOGIN_GAGAL', aktorLabel: 'uji', targetTipe: 'pengguna', targetId },
  });
  return { id: baris.id, targetId };
}

describe('audit_log append-only', () => {
  it('menolak UPDATE lewat SQL langsung dan membiarkan barisnya utuh', async () => {
    const { id } = await buatBarisAudit();

    await expect(
      getDb().$executeRaw`UPDATE audit_log SET aksi = 'DIUBAH' WHERE id = ${id}`,
    ).rejects.toThrow(/immutable/);

    const baris = await getDb().auditLog.findUniqueOrThrow({ where: { id } });
    expect(baris.aksi).toBe('LOGIN_GAGAL');
  });

  it('menolak DELETE lewat SQL langsung dan membiarkan barisnya utuh', async () => {
    const { id } = await buatBarisAudit();

    await expect(getDb().$executeRaw`DELETE FROM audit_log WHERE id = ${id}`).rejects.toThrow(
      /immutable/,
    );

    expect(await getDb().auditLog.findUnique({ where: { id } })).not.toBeNull();
  });

  it('menolak TRUNCATE', async () => {
    await buatBarisAudit();

    await expect(getDb().$executeRaw`TRUNCATE TABLE audit_log`).rejects.toThrow(/immutable/);

    expect(await getDb().auditLog.count()).toBeGreaterThan(0);
  });

  it('menolak UPDATE dan DELETE lewat Prisma Client', async () => {
    const { id } = await buatBarisAudit();

    await expect(
      getDb().auditLog.update({ where: { id }, data: { aksi: 'DIUBAH' } }),
    ).rejects.toThrow();
    await expect(getDb().auditLog.delete({ where: { id } })).rejects.toThrow();
  });
});

describe('audit() dalam transaksi', () => {
  it('ikut dibatalkan bersama perubahan data bila transaksi gagal', async () => {
    const targetId = `rollback-${randomBytes(6).toString('hex')}`;

    await expect(
      getDb().$transaction(async (tx) => {
        await audit(tx, {
          aksi: 'PERIODE_BUAT',
          aktorLabel: 'sistem',
          targetTipe: 'periode',
          targetId,
        });
        throw new Error('gagal setelah audit');
      }),
    ).rejects.toThrow('gagal setelah audit');

    expect(await getDb().auditLog.count({ where: { targetId } })).toBe(0);
  });

  it('tersimpan bersama perubahan data bila transaksi berhasil', async () => {
    const pengguna = await buatPengguna();

    await getDb().$transaction(async (tx) => {
      await tx.pengguna.update({ where: { id: pengguna.id }, data: { nama: 'Nama Baru' } });
      await audit(tx, {
        aksi: 'PENGGUNA_UBAH',
        aktor: { id: pengguna.id, username: pengguna.username },
        targetTipe: 'pengguna',
        targetId: pengguna.id,
        payload: { nama: 'Nama Baru' },
        konteks: { ip: '203.0.113.5', userAgent: 'UjiAgent/1.0' },
      });
    });

    const baris = await getDb().auditLog.findFirstOrThrow({ where: { targetId: pengguna.id } });
    expect(baris).toMatchObject({
      aksi: 'PENGGUNA_UBAH',
      aktorId: pengguna.id,
      aktorLabel: pengguna.username,
      payload: { nama: 'Nama Baru' },
      ip: '203.0.113.5',
      userAgent: 'UjiAgent/1.0',
    });
  });

  it('membuang IP yang bukan alamat sah dan memotong user agent panjang', async () => {
    const targetId = `ip-${randomBytes(6).toString('hex')}`;

    await getDb().$transaction(async (tx) => {
      await audit(tx, {
        aksi: 'AKSES_DITOLAK',
        aktorLabel: 'publik',
        targetTipe: 'uji',
        targetId,
        konteks: { ip: 'bukan-ip', userAgent: 'x'.repeat(400) },
      });
    });

    const baris = await getDb().auditLog.findFirstOrThrow({ where: { targetId } });
    expect(baris.ip).toBeNull();
    expect(baris.userAgent).toHaveLength(256);
  });
});

describe('pengguna', () => {
  it.each(['Admin', 'ab', 'dengan spasi', 'a'.repeat(33)])(
    'menolak username %j yang melanggar pola',
    async (username) => {
      await expect(
        getDb().pengguna.create({
          data: { username, nama: 'Uji', passwordHash: 'x', peran: 'ADMIN' },
        }),
      ).rejects.toThrow();
    },
  );

  it('menolak username ganda', async () => {
    const pengguna = await buatPengguna();

    await expect(
      getDb().pengguna.create({
        data: { username: pengguna.username, nama: 'Ganda', passwordHash: 'x', peran: 'ADMIN' },
      }),
    ).rejects.toThrow();
  });

  it('memberi bawaan aktif dan wajib ganti kata sandi pada akun baru', async () => {
    const baris = await getDb().pengguna.create({
      data: {
        username: `bawaan-${randomBytes(4).toString('hex')}`,
        nama: 'Uji',
        passwordHash: 'x',
        peran: 'OPERATOR',
      },
    });

    expect(baris).toMatchObject({ aktif: true, mustChangePassword: true, lastLoginAt: null });
  });
});
