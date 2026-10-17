import { BatalHasilSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { batalkanHasilUndian } from '@/server/services/hasil';

export const POST = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const data = await bacaJson(request, BatalHasilSchema);
  return batalkanHasilUndian(ctx.params.id, data, admin, ctx.konteks);
});
