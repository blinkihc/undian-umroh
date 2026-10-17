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

function pasangSecurityHeaders(response: NextResponse, cspHeader: string): void {
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Frame-Options', 'DENY');
}

/**
 * Proxy pengarah & pengaman (Next.js 16).
 * 1. Menegakkan CSP dan HTTP Security Headers (SECURITY §5).
 * 2. Melindungi rute Panel (/admin, /operator, /akun) serta perpanjangan cookie sesi bergulir.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'nonce-${nonce}'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    media-src 'self' blob:;
    font-src 'self';
    connect-src 'self';
    worker-src 'self' blob:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    object-src 'none';
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  const pathname = request.nextUrl.pathname;
  const isPanelRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/operator') ||
    pathname.startsWith('/akun');

  // Proteksi rute panel
  if (isPanelRoute) {
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
      tujuan.searchParams.set('callbackUrl', pathname);
      const redirectRes = NextResponse.redirect(tujuan);
      pasangSecurityHeaders(redirectRes, cspHeader);
      return redirectRes;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', cspHeader);

    const respons = NextResponse.next({
      request: { headers: requestHeaders },
    });

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

    pasangSecurityHeaders(respons, cspHeader);
    return respons;
  }

  // Rute non-panel: pasang nonce dan security headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const respons = NextResponse.next({
    request: { headers: requestHeaders },
  });

  pasangSecurityHeaders(respons, cspHeader);
  return respons;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
