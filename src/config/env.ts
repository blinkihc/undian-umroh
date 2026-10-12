import { z } from 'zod';

import { NAMA_APLIKASI_DEFAULT, VERSI_APLIKASI_DEFAULT } from './brand';

/** Kunci rahasia harus base64 dari tepat 32 byte (AES-256 / HMAC-SHA256). */
const kunciBase64 = z
  .string()
  .min(1, 'wajib diisi')
  .refine((nilai) => /^[A-Za-z0-9+/]+={0,2}$/.test(nilai), 'harus berupa teks base64')
  .refine((nilai) => Buffer.from(nilai, 'base64').length === 32, 'harus base64 dari tepat 32 byte');

/** Variabel opsional: string kosong diperlakukan sebagai tidak diisi. */
const opsional = z
  .string()
  .optional()
  .transform((nilai) => (nilai === undefined || nilai.trim() === '' ? undefined : nilai));

/**
 * Skema variabel lingkungan aplikasi (docs/ENVIRONMENT.md).
 * Variabel khusus Compose (POSTGRES_*), skrip backup (BACKUP_*), dan seed (SEED_*)
 * dibaca oleh konsumennya sendiri, bukan oleh aplikasi, sehingga tidak divalidasi di sini.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  APP_URL: z
    .url({ protocol: /^https?$/, error: 'harus URL http(s) yang valid' })
    .refine((nilai) => !nilai.endsWith('/'), 'tanpa garis miring di akhir'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  TZ: z.string().min(1).default('Asia/Jakarta'),
  DATABASE_URL: z
    .string()
    .min(1, 'wajib diisi')
    .refine((nilai) => /^postgres(ql)?:\/\//.test(nilai), 'harus berawalan postgresql://'),
  DATABASE_URL_TEST: opsional,
  AUTH_SECRET: kunciBase64,
  NIK_ENCRYPTION_KEY: kunciBase64,
  CAPTCHA_HMAC_KEY: kunciBase64,
  STORAGE_DIR: z.string().min(1, 'wajib diisi'),
  AI_PROVIDER: opsional,
  AI_API_KEY: opsional,
  AI_MODEL: opsional,
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default(NAMA_APLIKASI_DEFAULT),
  NEXT_PUBLIC_APP_VERSION: z.string().min(1).default(VERSI_APLIKASI_DEFAULT),
});

export type Env = z.infer<typeof EnvSchema>;

/** Kesalahan konfigurasi: pesan memuat nama variabel, tidak pernah nilainya (rahasia). */
export class EnvError extends Error {
  readonly masalah: readonly string[];

  constructor(masalah: readonly string[]) {
    super(
      `Konfigurasi lingkungan tidak valid. Perbaiki variabel berikut lalu jalankan ulang aplikasi:\n${masalah
        .map((baris) => `- ${baris}`)
        .join('\n')}`,
    );
    this.name = 'EnvError';
    this.masalah = masalah;
  }
}

/**
 * Memvalidasi sumber variabel lingkungan; gagal cepat bila ada yang hilang atau salah.
 * Murni terhadap `sumber` agar dapat diuji tanpa menyentuh `process.env`.
 */
export function parseEnv(sumber: Record<string, string | undefined>): Env {
  const hasil = EnvSchema.safeParse(sumber);
  if (hasil.success) {
    return hasil.data;
  }
  const masalah = hasil.error.issues.map((isu) => {
    const nama = isu.path.join('.') || '(env)';
    const hilang = sumber[nama] === undefined;
    return `${nama}: ${hilang ? 'belum diisi' : isu.message}`;
  });
  throw new EnvError(masalah);
}

let tersimpan: Env | undefined;

/** Env tervalidasi untuk proses server. Hanya boleh dipanggil dari kode server. */
export function getEnv(): Env {
  tersimpan ??= parseEnv(process.env);
  return tersimpan;
}
