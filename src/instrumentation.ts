/**
 * Dijalankan Next.js sekali saat server mulai. Validasi env di sini membuat aplikasi
 * berhenti langsung dengan pesan jelas bila konfigurasi salah (ENVIRONMENT.md).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvOrExit } = await import('@/config/startup');
    validateEnvOrExit();
  }
}
