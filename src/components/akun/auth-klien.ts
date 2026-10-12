/**
 * Pemanggil endpoint Auth.js dari peramban (login dan keluar). Auth.js mewajibkan token CSRF
 * dan, dengan header `X-Auth-Return-Redirect`, membalas JSON `{ url }` alih-alih mengalihkan.
 */

import { PESAN_LOGIN_DIBLOKIR, PESAN_LOGIN_GAGAL } from '@/lib/domain';

/**
 * Navigasi penuh (bukan router klien) setelah status sesi berubah: cookie baru pasti terkirim
 * dan cache router dibuang, sehingga server yang menentukan halaman tujuan.
 */
export function bukaHalaman(url: string): void {
  window.location.replace(url);
}

export type HasilLogin =
  { ok: true } | { ok: false; jenis: 'gagal' | 'diblokir' | 'jaringan'; pesan: string };

const PESAN_JARINGAN = 'Koneksi terputus. Periksa jaringan Anda lalu coba lagi.';

async function ambilCsrf(): Promise<string> {
  const respons = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  const isi = (await respons.json()) as { csrfToken?: string };
  if (typeof isi.csrfToken !== 'string') {
    throw new Error('Token CSRF tidak tersedia.');
  }
  return isi.csrfToken;
}

async function kirimForm(jalur: string, isi: Record<string, string>): Promise<Response> {
  return fetch(jalur, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({ csrfToken: await ambilCsrf(), ...isi }),
  });
}

export async function kirimLogin(username: string, password: string): Promise<HasilLogin> {
  try {
    const respons = await kirimForm('/api/auth/callback/credentials', {
      username,
      password,
      callbackUrl: '/login',
    });
    if (respons.status === 429) {
      return { ok: false, jenis: 'diblokir', pesan: PESAN_LOGIN_DIBLOKIR };
    }
    const isi = (await respons.json()) as { url?: string };
    const url = new URL(isi.url ?? '/login', window.location.origin);
    const galat = url.searchParams.get('error');
    if (galat === null) {
      return { ok: true };
    }
    if (url.searchParams.get('code') === 'login_diblokir') {
      return { ok: false, jenis: 'diblokir', pesan: PESAN_LOGIN_DIBLOKIR };
    }
    return { ok: false, jenis: 'gagal', pesan: PESAN_LOGIN_GAGAL };
  } catch {
    return { ok: false, jenis: 'jaringan', pesan: PESAN_JARINGAN };
  }
}

/** Mengakhiri sesi; true bila berhasil. Auth.js menghapus cookie dan mencatat audit LOGOUT. */
export async function kirimLogout(): Promise<boolean> {
  try {
    const respons = await kirimForm('/api/auth/signout', { callbackUrl: '/login' });
    return respons.ok;
  } catch {
    return false;
  }
}
