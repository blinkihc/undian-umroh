import { NextResponse, type NextRequest } from 'next/server';

import { requireRole } from '@/server/auth/halaman';
import { withHandler } from '@/server/http';
import { ambilInfoPaket, buatPaketZip } from '@/server/services/paket';

type Params = { params: Promise<{ id: string }> };

export const GET = withHandler(async (request: NextRequest, { params }: Params) => {
  const { user, konteks } = await requireRole(request, 'ADMIN');
  const { id } = await params;

  // Jika diminta format JSON atau info, kembalikan metadata ringkasan paket
  const format = request.nextUrl.searchParams.get('format');
  const accept = request.headers.get('accept') ?? '';
  if (format === 'json' || accept.includes('application/json')) {
    return ambilInfoPaket(id);
  }

  const { zipBuffer, namaFile } = await buatPaketZip({
    aktor: user,
    periodeId: id,
    konteks,
  });

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${namaFile}"`,
      'Content-Length': zipBuffer.byteLength.toString(),
      'Cache-Control': 'no-store',
    },
  });
});
