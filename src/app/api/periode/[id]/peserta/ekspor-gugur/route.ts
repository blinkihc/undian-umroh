import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { eksporDaftarGugur } from '@/server/services/peserta';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  ctx.userId = admin.id;
  const { namaFile, isi } = await eksporDaftarGugur({
    aktor: admin,
    periodeId: ctx.params.id,
    konteks: ctx.konteks,
  });
  return new Response(isi, {
    headers: {
      'Content-Type': MIME_XLSX,
      'Content-Disposition': `attachment; filename="${namaFile}"`,
      'Cache-Control': 'no-store',
    },
  });
});
