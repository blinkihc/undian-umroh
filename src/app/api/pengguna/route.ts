import { BuatPenggunaSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, responsJson, withHandler } from '@/server/http';
import { buatPenggunaBaru, daftarPengguna } from '@/server/services/pengguna';

export const GET = withHandler(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  return { items: await daftarPengguna() };
});

export const POST = withHandler(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const data = await bacaJson(request, BuatPenggunaSchema);
  const pengguna = await buatPenggunaBaru({ aktor: admin, data, konteks: ctx.konteks });
  return responsJson(pengguna, { status: 201 });
});
