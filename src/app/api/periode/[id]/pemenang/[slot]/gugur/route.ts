import { GugurInputSchema } from '@/lib/domain/pemenang';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { tandaiGugurPemenang } from '@/server/services/pemenang';

export const POST = withHandler<{ id: string; slot: string }>(async (request, ctx) => {
  const pengguna = await requireRole(request, ['ADMIN']);
  const input = await bacaJson(request, GugurInputSchema);
  return tandaiGugurPemenang(ctx.params.id, ctx.params.slot, input, pengguna, ctx.konteks);
});
