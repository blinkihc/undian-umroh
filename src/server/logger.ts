import 'server-only';

import pino, { type DestinationStream, type Level, type Logger } from 'pino';

import { getEnv } from '@/config/env';

const CENSOR = '[DISEMBUNYIKAN]';

/** Nama field yang nilainya tidak boleh muncul di log (SECURITY §7, OBSERVABILITY). */
const KUNCI_RAHASIA = [
  'password',
  'passwordLama',
  'passwordBaru',
  'passwordHash',
  'nik',
  'nikEnc',
  'apiKey',
  'captcha',
  'token',
  'authorization',
  'cookie',
] as const;

/**
 * Jalur yang disamarkan: header sensitif dan setiap field rahasia di tingkat teratas maupun satu
 * tingkat di bawahnya. pino hanya mendukung wildcard untuk seluruh segmen jalur.
 */
export const JALUR_REDACT: readonly string[] = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  ...KUNCI_RAHASIA,
  ...KUNCI_RAHASIA.map((kunci) => `*.${kunci}`),
];

/** Membuat logger JSON satu baris per kejadian. `tujuan` hanya dipakai tes. */
export function buatLogger(level: Level, tujuan?: DestinationStream): Logger {
  return pino(
    {
      level,
      base: null,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: [...JALUR_REDACT], censor: CENSOR },
    },
    tujuan,
  );
}

const globalLogger = globalThis as typeof globalThis & { __loggerUndian?: Logger };

/** Logger aplikasi tunggal; gunakan `.child({ requestId, userId })` di handler. */
export function getLogger(): Logger {
  globalLogger.__loggerUndian ??= buatLogger(getEnv().LOG_LEVEL);
  return globalLogger.__loggerUndian;
}
