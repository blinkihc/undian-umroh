import { getDb } from '@/server/db';

/**
 * Mengosongkan tabel periode dan turunannya. Aturan satu periode aktif membuat tes periode
 * saling bergantung bila data lama dibiarkan; audit_log tidak berelasi ke periode sehingga
 * tetap utuh. Tiket berikutnya menambah tabel turunan di sini (urutan anak dulu).
 */
export async function bersihkanPeriode(): Promise<void> {
  const db = getDb();
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "snapshot" DISABLE TRIGGER ALL;
      ALTER TABLE "snapshot_peserta" DISABLE TRIGGER ALL;
      ALTER TABLE "hasil_undian" DISABLE TRIGGER ALL;
    EXCEPTION WHEN OTHERS THEN
    END $$;
  `);

  await db.riwayatStatusPemenang.deleteMany();
  await db.slotHasil.deleteMany();
  await db.hasilUndian.deleteMany();
  await db.paketUnduhan.deleteMany();
  await db.snapshotPeserta.deleteMany();
  await db.snapshot.deleteMany();
  await db.peserta.deleteMany();
  await db.impor.deleteMany();
  await db.kecamatanWilayah.deleteMany();
  await db.wilayah.deleteMany();
  await db.periode.deleteMany();

  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "snapshot" ENABLE TRIGGER ALL;
      ALTER TABLE "snapshot_peserta" ENABLE TRIGGER ALL;
      ALTER TABLE "hasil_undian" ENABLE TRIGGER ALL;
    EXCEPTION WHEN OTHERS THEN
    END $$;
  `);
}

/** Mengubah status periode langsung di DB untuk menyiapkan keadaan yang belum punya endpoint. */
export async function aturStatusPeriode(
  id: string,
  status: 'DRAF' | 'TERKUNCI' | 'DIUNDI' | 'FINAL' | 'DIPUBLIKASI',
): Promise<void> {
  await getDb().periode.update({ where: { id }, data: { status } });
}

let counterPeriode = 1;

/** Periode Draf langsung di DB (tanpa API) dengan dua wilayah bawaan. */
export async function buatPeriodeTes(
  createdById?: string,
): Promise<{ id: string; version: number; slug: string; judul: string }> {
  let aktorId = createdById;
  if (!aktorId) {
    const admin = await getDb().pengguna.findFirst({ where: { peran: 'ADMIN' } });
    if (admin) {
      aktorId = admin.id;
    } else {
      const adminBaru = await getDb().pengguna.create({
        data: {
          username: `adm_${Date.now().toString(36)}_${(counterPeriode++).toString(36)}`,
          nama: 'Admin Uji',
          passwordHash: 'hash',
          peran: 'ADMIN',
        },
      });
      aktorId = adminBaru.id;
    }
  }

  return getDb().periode.create({
    data: {
      slug: `uji-${Date.now().toString(36)}-${(counterPeriode++).toString(36)}`,
      judul: 'Periode Uji Impor',
      batasLunas: new Date('2026-09-30T23:59:59+07:00'),
      createdById: aktorId,
      wilayah: {
        create: [
          { kode: 'W1', nama: 'Wilayah 1' },
          { kode: 'W2', nama: 'Wilayah 2' },
        ],
      },
    },
    select: { id: true, version: true, slug: true, judul: true },
  });
}
