import { BeritaAcaraInputSchema } from '@/lib/domain/berita-acara';
import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { ambilBeritaAcara, simpanBeritaAcara } from '@/server/services/berita-acara';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  await requireRole(request, ['ADMIN']);
  return ambilBeritaAcara(ctx.params.id);
});

export const PUT = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  const json = await request.json();
  const input = BeritaAcaraInputSchema.parse(json);
  return simpanBeritaAcara(ctx.params.id, input, admin, ctx.konteks);
});
