import 'server-only';

import { type Logger } from 'pino';
import { z, type ZodType } from 'zod';

import { getEnv } from '@/config/env';
import { Prisma } from '@/generated/prisma/client';
import { AppError, type KodeError } from '@/server/errors';
import { getLogger } from '@/server/logger';
import { ambilKonteks, buatRequestId, hashIpHarian, type KonteksRequest } from '@/server/request';

// Pesan validasi bawaan zod berbahasa Indonesia (semua teks antarmuka Bahasa Indonesia).
z.config(z.locales.id());

const METODE_MUTASI = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Batas isi JSON umum 100 KB (SECURITY §5). */
const UKURAN_JSON_MAKS = 100 * 1024;

export type KonteksHandler<P> = {
  requestId: string;
  logger: Logger;
  konteks: KonteksRequest;
  params: P;
  /** Diisi handler setelah autentikasi agar log "request selesai" memuat `userId`. */
  userId?: string;
};

type HasilHandler = Response | Record<string, unknown>;

/** Respons JSON; data admin tidak boleh tersimpan di cache perantara. */
export function responsJson(isi: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store');
  }
  return Response.json(isi, { ...init, headers });
}

/**
 * Membaca isi JSON dengan batas ukuran lalu memvalidasinya dengan skema zod `strict`
 * (field tak dikenal ditolak, SECURITY §5). Kegagalan dipetakan `withHandler` ke 400.
 */
export async function bacaJson<T>(
  request: Request,
  skema: ZodType<T>,
  maksBytes: number = UKURAN_JSON_MAKS,
): Promise<T> {
  const panjang = Number(request.headers.get('content-length') ?? 0);
  const teks = panjang > maksBytes ? null : await request.text();
  if (teks === null || Buffer.byteLength(teks) > maksBytes) {
    throw new AppError('FILE_TERLALU_BESAR', 413, 'Isi permintaan terlalu besar.');
  }
  let data: unknown;
  try {
    data = JSON.parse(teks);
  } catch {
    throw new AppError('VALIDASI_GAGAL', 400, 'Isi permintaan harus berupa JSON yang valid.');
  }
  return skema.parse(data);
}

/** Proteksi CSRF: mutasi hanya dari origin aplikasi sendiri (API.md §1, SECURITY §5). */
function periksaOrigin(request: Request, logger: Logger): void {
  const origin = request.headers.get('origin');
  if (origin !== getEnv().APP_URL) {
    logger.warn({ origin: origin?.slice(0, 200) ?? null }, 'origin tidak sesuai');
    throw new AppError(
      'AKSES_DITOLAK',
      403,
      'Permintaan ditolak. Muat ulang halaman lalu coba lagi.',
    );
  }
}

function galatKoneksiDatabase(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code);
  }
  const kode = (error as { code?: unknown } | null)?.code;
  return kode === 'ECONNREFUSED' || kode === 'ETIMEDOUT' || kode === 'ENOTFOUND';
}

type GalatTerpetakan = {
  status: number;
  code: KodeError;
  message: string;
  details?: Record<string, unknown>;
};

/** Memetakan error apa pun ke format error standar API.md §1.1 (CODE_STYLE §7). */
function petakanError(error: unknown, requestId: string): GalatTerpetakan {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      ...(error.details !== undefined && { details: error.details }),
    };
  }
  if (error instanceof z.ZodError) {
    const fields: Record<string, string> = {};
    for (const isu of error.issues) {
      const nama = isu.path.join('.') || '(isi)';
      fields[nama] ??= isu.message;
    }
    return {
      status: 400,
      code: 'VALIDASI_GAGAL',
      message: 'Data tidak valid.',
      details: { fields },
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return {
      status: 409,
      code: 'CONFLICT',
      message: 'Data sudah ada atau baru saja berubah. Muat ulang lalu coba lagi.',
    };
  }
  if (galatKoneksiDatabase(error)) {
    return {
      status: 503,
      code: 'LAYANAN_TIDAK_TERSEDIA',
      message: 'Layanan sedang gangguan. Coba beberapa saat lagi.',
    };
  }
  return {
    status: 500,
    code: 'KESALAHAN_SERVER',
    message: `Terjadi kesalahan pada server. Coba lagi. Jika berulang, hubungi admin dan sebutkan kode: ${requestId}.`,
  };
}

function denganRequestId(respons: Response, requestId: string): Response {
  try {
    respons.headers.set('X-Request-Id', requestId);
    return respons;
  } catch {
    // Header Response hasil redirect/fetch tidak dapat diubah; salin ke Response baru.
    const salinan = new Response(respons.body, respons);
    salinan.headers.set('X-Request-Id', requestId);
    return salinan;
  }
}

/**
 * Pembungkus semua Route Handler: memberi `requestId`, memeriksa `Origin` untuk mutasi,
 * memetakan error ke format standar, menambah `X-Request-Id` di setiap respons, dan mencatat
 * log request tanpa data sensitif (CODE_STYLE §7, OBSERVABILITY).
 */
export function withHandler<P = Record<string, never>>(
  handler: (request: Request, ctx: KonteksHandler<P>) => Promise<HasilHandler>,
): (request: Request, context?: { params: Promise<P> }) => Promise<Response> {
  return async (request, context) => {
    const mulai = performance.now();
    const requestId = buatRequestId();
    const konteks = ambilKonteks(request.headers);
    const logger = getLogger().child({ requestId });
    const { pathname } = new URL(request.url);
    const ctx: KonteksHandler<P> = { requestId, logger, konteks, params: {} as P };
    let respons: Response;

    try {
      if (METODE_MUTASI.has(request.method)) {
        periksaOrigin(request, logger);
      }
      if (context !== undefined) {
        ctx.params = await context.params;
      }
      const hasil = await handler(request, ctx);
      respons = hasil instanceof Response ? hasil : responsJson(hasil);
    } catch (error) {
      const galat = petakanError(error, requestId);
      if (galat.status >= 500) {
        logger.error({ err: error }, 'request gagal');
      } else if (galat.code === 'AKSES_DITOLAK' || galat.code === 'TERLALU_BANYAK_PERMINTAAN') {
        logger.warn({ code: galat.code, ipHash: hashIpHarian(konteks.ip) }, 'request ditolak');
      }
      const headers = new Headers();
      const retryAfter = galat.details?.retryAfterDetik;
      if (galat.status === 429 && typeof retryAfter === 'number') {
        headers.set('Retry-After', String(retryAfter));
      }
      respons = responsJson(
        {
          error: {
            code: galat.code,
            message: galat.message,
            ...(galat.details !== undefined && { details: galat.details }),
            requestId,
          },
        },
        { status: galat.status, headers },
      );
    }

    logger.info(
      {
        method: request.method,
        path: pathname,
        status: respons.status,
        ...(ctx.userId !== undefined && { userId: ctx.userId }),
        durationMs: Math.round(performance.now() - mulai),
      },
      'request selesai',
    );
    return denganRequestId(respons, requestId);
  };
}
