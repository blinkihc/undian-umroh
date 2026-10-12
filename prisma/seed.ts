import { tutupDb } from '@/server/db';
import { pastikanAdminAwal } from '@/server/services/pengguna';

/**
 * Seed produksi (DATABASE.md §12, SECURITY.md §1): membuat akun Admin pertama dari
 * SEED_ADMIN_USERNAME dan SEED_ADMIN_PASSWORD. Idempoten; tidak mengubah akun yang sudah ada.
 * Dijalankan dengan `npm run db:seed`.
 */
async function utama(): Promise<void> {
  const username = process.env.SEED_ADMIN_USERNAME?.trim() ?? '';
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  if (username === '' || password === '') {
    throw new Error('SEED_ADMIN_USERNAME dan SEED_ADMIN_PASSWORD wajib diisi untuk seed.');
  }

  const hasil = await pastikanAdminAwal({ username, password });
  console.log(
    hasil === 'dibuat'
      ? `Akun Admin "${username.toLowerCase()}" dibuat. Wajib ganti kata sandi saat login pertama; hapus SEED_ADMIN_PASSWORD dari env.`
      : `Akun "${username.toLowerCase()}" sudah ada; tidak ada yang diubah.`,
  );
}

utama()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => tutupDb());
