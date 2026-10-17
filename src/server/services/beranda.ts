import 'server-only';

import { JUDUL_ACARA_DEFAULT } from '@/config/brand';
import { getDb } from '@/server/db';

export type RingkasanBeranda = {
  judulAcara: string;
  totalTiketSah: number;
  kuotaUmroh: number;
  statusKunci: boolean;
  snapshotHashRingkas: string | null;
  snapshotHashPenuh: string | null;
  statusPeriode: string;
  adaDataAktif: boolean;
};

/**
 * Mengambil ringkasan statistik beranda publik langsung dari database aktif.
 * Mengikuti aturan /antislop-ui (R-17/R-38) agar metrik yang tampil adalah data riil.
 */
export async function ambilRingkasanBeranda(): Promise<RingkasanBeranda> {
  const db = getDb();

  // Ambil periode aktif atau yang telah dipublikasikan
  const periode = await db.periode.findFirst({
    where: {
      status: {
        not: 'DIBATALKAN',
      },
    },
    orderBy: [
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      snapshot: {
        select: {
          hash: true,
          lockedAt: true,
        },
      },
      impor: {
        where: { aktif: true },
        select: {
          jumlahLolos: true,
          totalBaris: true,
        },
        take: 1,
      },
    },
  });

  if (!periode) {
    return {
      judulAcara: JUDUL_ACARA_DEFAULT,
      totalTiketSah: 0,
      kuotaUmroh: 2,
      statusKunci: false,
      snapshotHashRingkas: null,
      snapshotHashPenuh: null,
      statusPeriode: 'DRAF',
      adaDataAktif: false,
    };
  }

  const imporAktif = periode.impor[0];
  const totalTiket = imporAktif?.jumlahLolos ?? 0;
  const hashSnapshot = periode.snapshot?.hash ?? null;

  let hashRingkas: string | null = null;
  if (hashSnapshot) {
    hashRingkas = `${hashSnapshot.slice(0, 8)}...${hashSnapshot.slice(-8)}`;
  }

  return {
    judulAcara: periode.judul || JUDUL_ACARA_DEFAULT,
    totalTiketSah: totalTiket,
    kuotaUmroh: 2,
    statusKunci: Boolean(periode.snapshot),
    snapshotHashRingkas: hashRingkas,
    snapshotHashPenuh: hashSnapshot,
    statusPeriode: periode.status,
    adaDataAktif: totalTiket > 0,
  };
}
