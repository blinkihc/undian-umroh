import { LihatNikInputSchema } from '@/lib/domain/pemenang';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, responsJson, withHandler } from '@/server/http';
import { lihatNikPemenang } from '@/server/services/pemenang';

export const POST = withHandler<{ id: string; slot: string }>(async (request, ctx) => {
  const pengguna = await requireRole(request, ['ADMIN']);
  const input = await bacaJson(request, LihatNikInputSchema);
  const hasil = await lihatNikPemenang(ctx.params.id, ctx.params.slot, input, pengguna, ctx.konteks);
  return responsJson(hasil, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
});
