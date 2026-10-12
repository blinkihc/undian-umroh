import { type NextRequest } from 'next/server';

import { KunciPeriodeSchema, ambilPrasyaratKunci, kunciPeriode } from '@/server/services/kunci';
import { requireRole } from '@/server/auth/halaman';
import { withHandler } from '@/server/http';
import { bacaJson } from '@/server/request';

type Params = { params: Promise<{ id: string }> };

export const GET = withHandler(async (request: NextRequest, { params }: Params) => {
  await requireRole(request, 'ADMIN');
  const { id } = await params;
  return ambilPrasyaratKunci(id);
});

export const POST = withHandler(async (request: NextRequest, { params }: Params) => {
  const { user, konteks } = await requireRole(request, 'ADMIN');
  const { id } = await params;
  const data = await bacaJson(request, KunciPeriodeSchema);
  return kunciPeriode({ aktor: user, id, data, konteks });
});
