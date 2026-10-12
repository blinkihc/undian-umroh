import 'server-only';

import NextAuth, { CredentialsSignin, type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { getEnv } from '@/config/env';
import {
  BATAS_SESI_MUTLAK_MS,
  INTERVAL_PERPANJANG_DETIK,
  MASA_SESI_DETIK,
  isCookieAman,
} from '@/config/sesi';
import { AppError } from '@/server/errors';
import { getLogger } from '@/server/logger';
import { ambilKonteks } from '@/server/request';
import { LoginSchema } from '@/lib/domain';
import { catatLogout, masuk } from '@/server/services/autentikasi';

/** Dilempar saat login diblokir; `code` dibaca formulir login untuk menampilkan pesan blokir. */
export class LoginDiblokir extends CredentialsSignin {
  override code = 'login_diblokir';
}

function buatKonfigurasi(): NextAuthConfig {
  const env = getEnv();
  return {
    secret: env.AUTH_SECRET,
    // Host dikunci oleh Caddy; asal mutasi tetap dicek terhadap APP_URL oleh `withHandler`.
    trustHost: true,
    useSecureCookies: isCookieAman(env.APP_URL),
    session: { strategy: 'jwt', maxAge: MASA_SESI_DETIK, updateAge: INTERVAL_PERPANJANG_DETIK },
    pages: { signIn: '/login', error: '/login' },
    providers: [
      Credentials({
        credentials: { username: {}, password: {} },
        async authorize(kredensial, request) {
          const masukan = LoginSchema.safeParse({
            username: kredensial.username,
            password: kredensial.password,
          });
          if (!masukan.success) {
            return null;
          }
          try {
            const pengguna = await masuk({
              ...masukan.data,
              konteks: ambilKonteks(request.headers),
            });
            return pengguna === null ? null : { id: pengguna.id };
          } catch (error) {
            if (error instanceof AppError && error.status === 429) {
              throw new LoginDiblokir();
            }
            throw error;
          }
        },
      }),
    ],
    callbacks: {
      // Token hanya memuat ID pengguna dan waktu login; peran dan status akun dibaca dari database.
      jwt({ token, user, trigger }) {
        if (trigger === 'signIn' && user.id !== undefined) {
          return { sub: user.id, loginAt: Date.now() };
        }
        const loginAt = token.loginAt;
        if (typeof loginAt !== 'number' || Date.now() - loginAt > BATAS_SESI_MUTLAK_MS) {
          return null;
        }
        return token;
      },
    },
    events: {
      async signOut(pesan) {
        const sub = 'token' in pesan ? pesan.token?.sub : undefined;
        if (sub === undefined) {
          return;
        }
        try {
          await catatLogout(sub);
        } catch (error) {
          getLogger().error({ err: error }, 'audit logout gagal');
        }
      },
    },
    logger: {
      // Login gagal sudah dicatat sendiri (log dan audit), jadi tidak dicatat dua kali di sini.
      error(error) {
        if (!(error instanceof CredentialsSignin)) {
          getLogger().error({ err: error }, 'kesalahan Auth.js');
        }
      },
      warn(kode) {
        getLogger().warn({ kode }, 'peringatan Auth.js');
      },
      debug() {},
    },
  };
}

// Konfigurasi dibuat saat request pertama, bukan saat modul dimuat, agar `next build` tidak butuh env.
export const { handlers } = NextAuth(() => buatKonfigurasi());
