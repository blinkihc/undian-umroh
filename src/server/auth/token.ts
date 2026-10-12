import 'server-only';

import { getToken } from 'next-auth/jwt';

import { getEnv } from '@/config/env';
import { namaCookieSesi } from '@/config/sesi';

/** Klaim sesi yang kita pakai. Peran dan status akun selalu dibaca ulang dari database. */
export type TokenSesi = {
  /** ID pengguna. */
  sub: string;
  /** Waktu login (ms epoch); dasar batas mutlak 12 jam. */
  loginAt: number;
};

/** Membaca dan memverifikasi JWT sesi dari header Cookie. Null bila tidak ada atau tidak sah. */
export async function bacaTokenSesi(headers: Headers): Promise<TokenSesi | null> {
  const env = getEnv();
  const nama = namaCookieSesi(env.APP_URL);
  const token = await getToken({
    req: { headers },
    secret: env.AUTH_SECRET,
    cookieName: nama,
    salt: nama,
  });
  if (token === null || typeof token.sub !== 'string' || typeof token.loginAt !== 'number') {
    return null;
  }
  return { sub: token.sub, loginAt: token.loginAt };
}
