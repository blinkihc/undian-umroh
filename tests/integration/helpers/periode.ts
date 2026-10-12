import { getDb } from '@/server/db';

/**
 * Mengosongkan tabel periode dan turunannya. Aturan satu periode aktif membuat tes periode
 * saling bergantung bila data lama dibiarkan; audit_log tidak berelasi ke periode sehingga
 * tetap utuh. Tiket berikutnya menambah tabel turunan di sini (urutan anak dulu).
 */
export async function bersihkanPeriode(): Promise<void> {
  const db = getDb();
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
