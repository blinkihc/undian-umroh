import { NextResponse } from 'next/server';
import { z } from 'zod';

import { verifikasiCaptcha } from '@/server/captcha';
import { AppError } from '@/server/errors';
import { withHandler } from '@/server/http';
import { catatPermintaanCekNop, periksaRateLimitCekNop } from '@/server/rate-limit-publik';
import { cekNopPublik } from '@/server/services/peserta';

const SolusiCaptchaSchema = z.object({
  salt: z.string().min(1),
  nonce: z.number().int().nonnegative(),
  expiresAt: z.string().min(1),
  signature: z.string().min(1),
});

const CekNopSchema = z.object({
  nop: z.string().trim().min(1, 'NOP wajib diisi'),
  captcha: SolusiCaptchaSchema.optional(),
});

export const POST = withHandler(async (request, { konteks }) => {
  const ip = konteks.ip ?? '127.0.0.1';
  const limitStatus = await periksaRateLimitCekNop(ip, konteks);

  const json = await request.json();
  const parsed = CekNopSchema.parse(json);

  if (limitStatus.butuhCaptcha) {
    if (!parsed.captcha) {
      throw new AppError('TERLALU_BANYAK_PERMINTAAN', 429, 'Verifikasi captcha diperlukan.', {
        captchaDiperlukan: true,
      });
    }
    verifikasiCaptcha(parsed.captcha);
  }

  catatPermintaanCekNop(ip);
  const hasil = await cekNopPublik(parsed.nop);
  return NextResponse.json(hasil);
});

export const GET = withHandler(async (request, { konteks }) => {
  const ip = konteks.ip ?? '127.0.0.1';
  const limitStatus = await periksaRateLimitCekNop(ip, konteks);

  if (limitStatus.butuhCaptcha) {
    throw new AppError('TERLALU_BANYAK_PERMINTAAN', 429, 'Verifikasi captcha diperlukan.', {
      captchaDiperlukan: true,
    });
  }

  const url = new URL(request.url);
  const nop = url.searchParams.get('nop') ?? '';

  catatPermintaanCekNop(ip);
  const hasil = await cekNopPublik(nop);
  return NextResponse.json(hasil);
});
