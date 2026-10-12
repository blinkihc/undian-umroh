import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { ambilPemenangPeriode } from '@/server/services/pemenang';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  await requireRole(request, ['ADMIN']);
  return ambilPemenangPeriode(ctx.params.id);
});
