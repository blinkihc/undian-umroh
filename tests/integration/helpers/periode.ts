import { getDb } from '@/server/db';

/**
 * Mengosongkan tabel periode dan turunannya. Aturan satu periode aktif membuat tes periode
 * saling bergantung bila data lama dibiarkan; audit_log tidak berelasi ke periode sehingga
 * tetap utuh. Tiket berikutnya menambah tabel turunan di sini (urutan anak dulu).
 */
export async function bersihkanPeriode(): Promise<void> {
  const db = getDb();
  await db.peserta.deleteMany();
  await db.impor.deleteMany();
  await db.kecamatanWilayah.deleteMany();
  await db.wilayah.deleteMany();
  await db.periode.deleteMany();
}

/** Mengubah status periode langsung di DB untuk menyiapkan keadaan yang belum punya endpoint. */
export async function aturStatusPeriode(
  id: string,
  status: 'DRAF' | 'TERKUNCI' | 'DIUNDI' | 'FINAL' | 'DIPUBLIKASI',
): Promise<void> {
  await getDb().periode.update({ where: { id }, data: { status } });
}

/** Periode Draf langsung di DB (tanpa API) dengan dua wilayah bawaan. */
export async function buatPeriodeTes(
  createdById: string,
): Promise<{ id: string; version: number }> {
  return getDb().periode.create({
    data: {
      slug: `uji-${Date.now().toString(36)}`,
      judul: 'Periode Uji Impor',
      batasLunas: new Date('2026-09-30T23:59:59+07:00'),
      createdById,
      wilayah: {
        create: [
          { kode: 'W1', nama: 'Wilayah 1' },
          { kode: 'W2', nama: 'Wilayah 2' },
        ],
      },
    },
    select: { id: true, version: true },
  });
}
