import { encode } from 'next-auth/jwt';

import { POST as authPost, GET as authGet } from '@/app/api/auth/[...nextauth]/route';
import { getEnv } from '@/config/env';
import { MASA_SESI_DETIK } from '@/config/sesi';

import { APP_URL_TES } from '../../support/env-tes.mts';

/** Nama cookie sesi pada env tes (APP_URL https, jadi berawalan __Secure-). */
export const NAMA_COOKIE_SESI = '__Secure-authjs.session-token';

type OpsiRequest = {
  method?: string;
  /** Isi JSON; mengisi Content-Type otomatis. */
  json?: unknown;
  /** Isi form urlencoded (dipakai Auth.js). */
  form?: Record<string, string>;
  /** Header Cookie lengkap. */
  cookie?: string | null;
  /** Origin permintaan. Bawaan = APP_URL; `null` menghilangkan header. */
  origin?: string | null;
  ip?: string;
  headers?: Record<string, string>;
};

/** Membuat Request seperti yang diterima Route Handler, lengkap dengan Origin same-origin. */
export function buatRequest(jalur: string, opsi: OpsiRequest = {}): Request {
  const method =
    opsi.method ?? (opsi.json !== undefined || opsi.form !== undefined ? 'POST' : 'GET');
  const headers = new Headers(opsi.headers);
  const origin = opsi.origin === undefined ? APP_URL_TES : opsi.origin;
  if (origin !== null && method !== 'GET') {
    headers.set('Origin', origin);
  }
  if (opsi.cookie) {
    headers.set('Cookie', opsi.cookie);
  }
  if (opsi.ip) {
    headers.set('X-Forwarded-For', opsi.ip);
  }
  let body: string | undefined;
  if (opsi.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(opsi.json);
  } else if (opsi.form !== undefined) {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    body = new URLSearchParams(opsi.form).toString();
  }
  return new Request(`${APP_URL_TES}${jalur}`, {
    method,
    headers,
    ...(body !== undefined && { body }),
  });
}

/** Header Cookie dari semua Set-Cookie sebuah respons (nilai kosong = cookie dihapus, dilewati). */
export function cookieDariRespons(respons: Response): string {
  return respons.headers
    .getSetCookie()
    .map((baris) => baris.split(';')[0] ?? '')
    .filter((pasangan) => !pasangan.endsWith('='))
    .join('; ');
}

export type HasilMasuk = {
  /** Respons mentah dari endpoint callback. */
  respons: Response;
  /** `error` / `code` dari URL balasan Auth.js; null bila login berhasil. */
  galat: { error: string; code: string | null } | null;
  /** Header Cookie sesi bila berhasil, selain itu null. */
  cookie: string | null;
  /** Nilai Set-Cookie mentah cookie sesi (untuk memeriksa atribut). */
  setCookieSesi: string | null;
};

/**
 * Login lewat alur Auth.js yang sama dengan peramban: ambil token CSRF, lalu kirim kredensial
 * ke callback credentials melalui Route Handler sungguhan.
 */
export async function masuk(
  username: string,
  password: string,
  opsi: { ip?: string } = {},
): Promise<HasilMasuk> {
  const csrf = await authGet(buatRequest('/api/auth/csrf'), {
    params: Promise.resolve({ nextauth: ['csrf'] }),
  });
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };

  const respons = await authPost(
    buatRequest('/api/auth/callback/credentials', {
      form: { csrfToken, username, password, callbackUrl: '/login' },
      cookie: cookieDariRespons(csrf),
      headers: { 'X-Auth-Return-Redirect': '1' },
      ...(opsi.ip !== undefined && { ip: opsi.ip }),
    }),
    { params: Promise.resolve({ nextauth: ['callback', 'credentials'] }) },
  );

  const setCookieSesi =
    respons.headers.getSetCookie().find((baris) => baris.startsWith(`${NAMA_COOKIE_SESI}=`)) ??
    null;
  let galat: HasilMasuk['galat'] = null;
  if (respons.status === 200) {
    const url = new URL(((await respons.clone().json()) as { url: string }).url);
    const error = url.searchParams.get('error');
    galat = error === null ? null : { error, code: url.searchParams.get('code') };
  }
  return {
    respons,
    galat,
    cookie: setCookieSesi === null ? null : cookieDariRespons(respons),
    setCookieSesi,
  };
}

/** Cookie sesi bertanda tangan sah dengan klaim yang ditentukan tes (mis. login 13 jam lalu). */
export async function buatCookieSesi(klaim: { sub: string; loginAt: number }): Promise<string> {
  const token = await encode({
    token: klaim,
    secret: getEnv().AUTH_SECRET,
    salt: NAMA_COOKIE_SESI,
    maxAge: MASA_SESI_DETIK,
  });
  return `${NAMA_COOKIE_SESI}=${token}`;
}

/** Keluar lewat Auth.js (CSRF + cookie sesi). */
export async function keluar(cookieSesi: string): Promise<Response> {
  const csrf = await authGet(buatRequest('/api/auth/csrf', { cookie: cookieSesi }), {
    params: Promise.resolve({ nextauth: ['csrf'] }),
  });
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  return authPost(
    buatRequest('/api/auth/signout', {
      form: { csrfToken, callbackUrl: '/login' },
      cookie: [cookieSesi, cookieDariRespons(csrf)].join('; '),
      headers: { 'X-Auth-Return-Redirect': '1' },
    }),
    { params: Promise.resolve({ nextauth: ['signout'] }) },
  );
}
