import { requireRole } from '@/server/auth/sesi';
import { AppError } from '@/server/errors';
import { withHandler } from '@/server/http';
import { unggahDanVerifikasiHasil } from '@/server/services/hasil';

const MAKS_BYTES_HASIL = 1024 * 1024; // 1 MB (API.md §3 Kunci, Paket, Hasil)

export const POST = withHandler<{ id: string }>(async (request, ctx) => {
  const pengguna = await requireRole(request, ['ADMIN', 'OPERATOR']);
  const id = ctx.params.id;

  // Periksa batas ukuran file 1 MB
  const panjang = Number(request.headers.get('content-length') ?? 0);
  if (panjang > MAKS_BYTES_HASIL) {
    throw new AppError('FILE_TERLALU_BESAR', 413, 'Ukuran file hasil melebihi 1 MB.');
  }

  const teks = await request.text();
  if (Buffer.byteLength(teks) > MAKS_BYTES_HASIL) {
    throw new AppError('FILE_TERLALU_BESAR', 413, 'Ukuran file hasil melebihi 1 MB.');
  }

  let jsonMentah: unknown;
  try {
    jsonMentah = JSON.parse(teks);
  } catch {
    throw new AppError('HASIL_TIDAK_VALID', 422, 'File hasil tidak valid.', {
      pemeriksaan: 'FORMAT',
    });
  }

  return unggahDanVerifikasiHasil(id, jsonMentah, pengguna, ctx.konteks);
});
