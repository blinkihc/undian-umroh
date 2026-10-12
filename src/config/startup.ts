import { EnvError, parseEnv } from './env';

/**
 * Validasi env saat server mulai. Next.js hanya mencatat error dari hook instrumentation
 * lalu tetap hidup, sehingga proses dihentikan sendiri di sini agar benar-benar gagal cepat
 * (ENVIRONMENT.md). Pesan memuat nama variabel, tidak pernah nilainya.
 */
export function validateEnvOrExit(sumber: Record<string, string | undefined> = process.env): void {
  try {
    parseEnv(sumber);
  } catch (error) {
    if (!(error instanceof EnvError)) {
      throw error;
    }
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
