import { FilterPesertaSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { daftarPeserta } from '@/server/services/peserta';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const query = Object.fromEntries(new URL(request.url).searchParams);
  return daftarPeserta(ctx.params.id, FilterPesertaSchema.parse(query));
});
