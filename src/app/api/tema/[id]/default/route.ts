import { NextResponse } from 'next/server';

import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { kembalikanTemaDefault } from '@/server/services/tema';

export const POST = withHandler<{ id: string }>(async (request, { params, konteks }) => {
  const aktor = await requireRole(request, ['ADMIN']);

  const hasil = await kembalikanTemaDefault(params.id, aktor, konteks);
  return NextResponse.json(hasil);
});
