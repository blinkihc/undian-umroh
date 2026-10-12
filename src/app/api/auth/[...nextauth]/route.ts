import { type NextRequest } from 'next/server';

import { handlers } from '@/server/auth/config';
import { withHandler } from '@/server/http';
import { pastikanLoginTidakDiblokir } from '@/server/services/autentikasi';

type Params = { nextauth: string[] };

/** Username dari isi form login, hanya untuk pra-pemeriksaan blokir; Auth.js tetap membaca sendiri. */
async function usernameDariForm(request: Request): Promise<string | null> {
  try {
    const username = (await request.clone().formData()).get('username');
    return typeof username === 'string' ? username.trim().toLowerCase() : null;
  } catch {
    // Isi tak terbaca sebagai form: biarkan Auth.js yang menolaknya.
    return null;
  }
}

// Sesi, CSRF, dan login/logout dikelola Auth.js; dibungkus agar mendapat X-Request-Id, cek Origin
// pada POST, dan format error standar (blokir login = 429 dengan Retry-After).
export const GET = withHandler<Params>((request) => handlers.GET(request as NextRequest));

export const POST = withHandler<Params>(async (request, ctx) => {
  if (ctx.params.nextauth.join('/') === 'callback/credentials') {
    const username = await usernameDariForm(request);
    if (username !== null) {
      pastikanLoginTidakDiblokir(username, ctx.konteks);
    }
  }
  return handlers.POST(request as NextRequest);
});
