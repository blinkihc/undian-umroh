import { BuatPeriodeSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, responsJson, withHandler } from '@/server/http';
import { buatPeriode, daftarPeriode } from '@/server/services/periode';

export const GET = withHandler(async (request, ctx) => {
  const pengguna = await requireRole(request, ['ADMIN', 'OPERATOR']);
  ctx.userId = pengguna.id;
  return { items: await daftarPeriode() };
});

export const POST = withHandler(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const data = await bacaJson(request, BuatPeriodeSchema);
  const periode = await buatPeriode({ aktor: admin, data, konteks: ctx.konteks });
  return responsJson(periode, { status: 201 });
});
