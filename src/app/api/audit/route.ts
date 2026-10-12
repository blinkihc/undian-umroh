import { FilterAuditSchema } from '@/lib/domain';
import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { daftarAudit } from '@/server/services/audit-log';

export const GET = withHandler(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const query = Object.fromEntries(new URL(request.url).searchParams);
  return daftarAudit(FilterAuditSchema.parse(query));
});
