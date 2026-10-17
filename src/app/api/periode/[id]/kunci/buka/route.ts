import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { BukaKunciPeriodeSchema, bukaKunciPeriode } from '@/server/services/kunci';

export const POST = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const data = await bacaJson(request, BukaKunciPeriodeSchema);
  return bukaKunciPeriode({
    periodeId: ctx.params.id,
    data,
    aktor: admin,
    konteks: ctx.konteks,
  });
});
