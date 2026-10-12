import { getToken, encode } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

import { getEnv } from '@/config/env';
import {
  BATAS_SESI_MUTLAK_MS,
  INTERVAL_PERPANJANG_DETIK,
  MASA_SESI_DETIK,
  isCookieAman,
  namaCookieSesi,
} from '@/config/sesi';

/**
 * Lapisan pertama perlindungan halaman Panel (SECURITY §2): tanpa sesi yang sah, diarahkan ke
 * /login dengan tujuan semula. Peran dan status akun TIDAK dicek di sini (tanpa database);
 * itu tugas penjaga di setiap halaman dan endpoint. Proxy juga memperbarui cookie sesi secara
 * bergulir selama pengguna aktif, dengan batas mutlak 12 jam sejak login.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const env = getEnv();
  const nama = namaCookieSesi(env.APP_URL);
  const token = await getToken({
    req: request,
    secret: env.AUTH_SECRET,
    cookieName: nama,
    salt: nama,
  });

  const sekarang = Date.now();
  const loginAt = token?.loginAt;
  const sah =
    token !== null &&
    typeof token.sub === 'string' &&
    typeof loginAt === 'number' &&
    sekarang - loginAt <= BATAS_SESI_MUTLAK_MS;

  if (!sah) {
    const tujuan = new URL('/login', request.url);
    tujuan.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(tujuan);
  }

  const respons = NextResponse.next();
  const umurDetik = sekarang / 1000 - (token.iat ?? 0);
  if (umurDetik >= INTERVAL_PERPANJANG_DETIK) {
    respons.cookies.set(
      nama,
      await encode({
        token: { sub: token.sub, loginAt },
        secret: env.AUTH_SECRET,
        salt: nama,
        maxAge: MASA_SESI_DETIK,
      }),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: isCookieAman(env.APP_URL),
        path: '/',
        maxAge: MASA_SESI_DETIK,
      },
    );
  }
  return respons;
}

export const config = {
  matcher: ['/admin/:path*', '/operator/:path*', '/akun/:path*'],
};
