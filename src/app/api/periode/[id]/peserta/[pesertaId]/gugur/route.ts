import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { GugurkanPesertaSchema, gugurkanPeserta } from '@/server/services/peserta';

export const POST = withHandler<{ id: string; pesertaId: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const data = await bacaJson(request, GugurkanPesertaSchema);
  return gugurkanPeserta({
    periodeId: ctx.params.id,
    pesertaId: ctx.params.pesertaId,
    data,
    aktor: admin,
    konteks: ctx.konteks,
  });
});
