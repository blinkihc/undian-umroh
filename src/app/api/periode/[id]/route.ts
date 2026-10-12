import { UbahPeriodeSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { ambilPeriode, ubahPeriode } from '@/server/services/periode';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  const pengguna = await requireRole(request, ['ADMIN', 'OPERATOR']);
  ctx.userId = pengguna.id;
  return ambilPeriode(ctx.params.id);
});

export const PATCH = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const perubahan = await bacaJson(request, UbahPeriodeSchema);
  return ubahPeriode({ aktor: admin, id: ctx.params.id, perubahan, konteks: ctx.konteks });
});
