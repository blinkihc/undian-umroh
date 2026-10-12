/**
 * Pemanggil API JSON dari peramban dengan format error standar (API.md §1.1). Komponen hanya
 * bercabang pada `code` dan menampilkan `message` / `fields` dari server (CODE_STYLE §7).
 */

export type HasilApi<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      fields: Record<string, string>;
      details: Record<string, unknown>;
    };

export const PESAN_JARINGAN = 'Koneksi terputus. Perubahan belum tersimpan. Coba lagi.';

type IsiGalat = {
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
};

export async function kirimJson<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  isi?: unknown,
): Promise<HasilApi<T>> {
  let respons: Response;
  try {
    respons = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: isi === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: isi === undefined ? undefined : JSON.stringify(isi),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      code: 'JARINGAN',
      message: PESAN_JARINGAN,
      fields: {},
      details: {},
    };
  }
  let data: unknown = null;
  try {
    data = await respons.json();
  } catch {
    data = null;
  }
  if (respons.ok) {
    return { ok: true, data: data as T };
  }
  const galat = (data as IsiGalat | null)?.error ?? {};
  const details = galat.details ?? {};
  const fields =
    typeof details.fields === 'object' && details.fields !== null
      ? (details.fields as Record<string, string>)
      : {};
  return {
    ok: false,
    status: respons.status,
    code: galat.code ?? 'KESALAHAN_SERVER',
    message: galat.message ?? 'Terjadi kesalahan pada server. Coba lagi.',
    fields,
    details,
  };
}
