import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { bacaFormImpor } from '@/server/impor/form';
import { imporFile } from '@/server/services/impor';

export const POST = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const file = await bacaFormImpor(request);
  return imporFile({ aktor: admin, periodeId: ctx.params.id, file, konteks: ctx.konteks });
});
