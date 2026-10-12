import { NextResponse } from 'next/server';

import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { ambilInfoPaket, buatPaketZip } from '@/server/services/paket';

export const GET = withHandler<{ id: string }>(async (request, ctx) => {
  const admin = await requireRole(request, ['ADMIN']);
  const id = ctx.params.id;

  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  const accept = request.headers.get('accept') ?? '';
  if (format === 'json' || accept.includes('application/json')) {
    return ambilInfoPaket(id);
  }

  const { zipBuffer, namaFile } = await buatPaketZip({
    aktor: admin,
    periodeId: id,
    konteks: ctx.konteks,
  });

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${namaFile}"`,
      'Cache-Control': 'no-store',
    },
  });
});
