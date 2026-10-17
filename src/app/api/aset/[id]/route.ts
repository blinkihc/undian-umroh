import { NextResponse } from 'next/server';

import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { bacaFileAset, hapusAset } from '@/server/services/tema';

export const GET = withHandler<{ id: string }>(async (_request, { params }) => {
  const { buffer, mime, nama } = await bacaFileAset(params.id);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(nama)}"`,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
});

export const DELETE = withHandler<{ id: string }>(async (request, { params, konteks }) => {
  const aktor = await requireRole(request, ['ADMIN']);

  await hapusAset(params.id, aktor, konteks);
  return NextResponse.json({ sukses: true, id: params.id });
});
