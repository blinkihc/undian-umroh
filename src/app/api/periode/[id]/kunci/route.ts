import { KunciPeriodeSchema, ambilPrasyaratKunci, kunciPeriode } from '@/server/services/kunci';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  await requireRole(request, ['ADMIN']);
  return ambilPrasyaratKunci(ctx.params.id);
});

export const POST = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  const data = await bacaJson(request, KunciPeriodeSchema);
  return kunciPeriode({ aktor: admin, id: ctx.params.id, data, konteks: ctx.konteks });
});
