import { NextResponse } from 'next/server';

import { withHandler } from '@/server/http';
import { periksaRateLimitPemenang } from '@/server/rate-limit-publik';
import { ambilPemenangPublik } from '@/server/services/pemenang';

export const GET = withHandler(async (_request, { konteks }) => {
  const ip = konteks.ip ?? '127.0.0.1';
  await periksaRateLimitPemenang(ip, konteks);

  const data = await ambilPemenangPublik();

  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
});
