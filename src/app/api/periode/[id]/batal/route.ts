import { BatalPeriodeSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { batalkanPeriode } from '@/server/services/periode';

export const POST = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const data = await bacaJson(request, BatalPeriodeSchema);
  return batalkanPeriode({ aktor: admin, id: ctx.params.id, data, konteks: ctx.konteks });
});
