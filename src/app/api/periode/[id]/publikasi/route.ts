import { PublikasiPeriodeSchema } from '@/lib/domain/periode';
import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { publikasikanPeriode } from '@/server/services/periode';

export const POST = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  const json = await request.json();
  const data = PublikasiPeriodeSchema.parse(json);

  return publikasikanPeriode({
    aktor: admin,
    id: ctx.params.id,
    data,
    konteks: ctx.konteks,
  });
});
