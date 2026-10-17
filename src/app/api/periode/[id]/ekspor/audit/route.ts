import { NextResponse } from 'next/server';

import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { unduhExcelAudit } from '@/server/services/berita-acara';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  const { buffer, namaFile } = await unduhExcelAudit(ctx.params.id, admin, ctx.konteks);

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${namaFile}"`,
      'Cache-Control': 'no-store',
    },
  });
});
