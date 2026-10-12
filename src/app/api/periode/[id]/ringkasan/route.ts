import { requireRole } from '@/server/auth/sesi';
import { AppError } from '@/server/errors';
import { withHandler } from '@/server/http';
import { ambilRingkasanPeserta } from '@/server/services/impor';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const ringkasan = await ambilRingkasanPeserta(ctx.params.id);
  if (ringkasan === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Belum ada data peserta.');
  }
  return ringkasan;
});
