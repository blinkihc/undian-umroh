import { UbahPenggunaSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { ubahPengguna } from '@/server/services/pengguna';

export const PATCH = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const perubahan = await bacaJson(request, UbahPenggunaSchema);
  return ubahPengguna({ aktor: admin, id: ctx.params.id, perubahan, konteks: ctx.konteks });
});
