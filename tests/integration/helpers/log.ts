import { getLogger } from '@/server/logger';

/**
 * Membisukan log aplikasi selama satu tes yang sengaja memicu error, supaya keluaran test tetap
 * bersih. Kembalikan fungsi pemulih untuk dipanggil di `afterEach`.
 */
export function senyapkanLog(): () => void {
  const logger = getLogger();
  const levelAsal = logger.level;
  logger.level = 'silent';
  return () => {
    logger.level = levelAsal;
  };
}
