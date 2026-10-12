import { PemetaanSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { ambilPemetaan, simpanPemetaan } from '@/server/services/wilayah';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  return ambilPemetaan(ctx.params.id);
});

export const PUT = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const data = await bacaJson(request, PemetaanSchema);
  return simpanPemetaan({ aktor: admin, periodeId: ctx.params.id, data, konteks: ctx.konteks });
});
