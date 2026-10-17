import { NextResponse } from 'next/server';

import { buatTantanganCaptcha } from '@/server/captcha';
import { withHandler } from '@/server/http';

export const GET = withHandler(async () => {
  const tantangan = buatTantanganCaptcha();
  return NextResponse.json(tantangan);
});
