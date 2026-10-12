import 'server-only';

/** Opsi pembatas percobaan gagal; `sekarang` dapat diinjeksi agar waktu bisa diuji. */
export type OpsiLimiterGagal = {
  maksGagal: number;
  jendelaMs: number;
  blokirMs: number;
  sekarang?: () => number;
};

export type StatusLimiter = {
  terblokir: boolean;
  /** Detik tersisa sampai blokir berakhir (0 bila tidak terblokir). */
  retryAfterDetik: number;
};

export type LimiterGagal = {
  cek(kunci: string): StatusLimiter;
  /** Mencatat satu kegagalan; `terblokirSekarang` true bila kegagalan ini memulai blokir. */
  catatGagal(kunci: string): { terblokirSekarang: boolean };
  reset(kunci: string): void;
  resetSemua(): void;
};

type StatusKunci = { gagal: number[]; blokirSampai: number };

const UKURAN_PETA_SEBELUM_BERSIH = 5_000;

/**
 * Pembatas percobaan gagal di memori proses (SECURITY §5): `maksGagal` kegagalan dalam
 * `jendelaMs` memblokir kunci selama `blokirMs`. Percobaan saat terblokir tidak memperpanjang blokir.
 */
export function buatLimiterGagal(opsi: OpsiLimiterGagal): LimiterGagal {
  const { maksGagal, jendelaMs, blokirMs } = opsi;
  const sekarang = opsi.sekarang ?? Date.now;
  const peta = new Map<string, StatusKunci>();

  function bersihkanKadaluarsa(waktu: number): void {
    for (const [kunci, status] of peta) {
      const blokirAktif = status.blokirSampai > waktu;
      const adaGagalBaru = status.gagal.some((catatan) => catatan > waktu - jendelaMs);
      if (!blokirAktif && !adaGagalBaru) {
        peta.delete(kunci);
      }
    }
  }

  return {
    cek(kunci) {
      const waktu = sekarang();
      const status = peta.get(kunci);
      if (status !== undefined && status.blokirSampai > waktu) {
        return {
          terblokir: true,
          retryAfterDetik: Math.ceil((status.blokirSampai - waktu) / 1000),
        };
      }
      return { terblokir: false, retryAfterDetik: 0 };
    },

    catatGagal(kunci) {
      const waktu = sekarang();
      if (peta.size >= UKURAN_PETA_SEBELUM_BERSIH) {
        bersihkanKadaluarsa(waktu);
      }
      const status = peta.get(kunci) ?? { gagal: [], blokirSampai: 0 };
      if (status.blokirSampai > waktu) {
        return { terblokirSekarang: false };
      }
      const gagal = [...status.gagal.filter((catatan) => catatan > waktu - jendelaMs), waktu];
      if (gagal.length >= maksGagal) {
        peta.set(kunci, { gagal: [], blokirSampai: waktu + blokirMs });
        return { terblokirSekarang: true };
      }
      peta.set(kunci, { gagal, blokirSampai: 0 });
      return { terblokirSekarang: false };
    },

    reset(kunci) {
      peta.delete(kunci);
    },

    resetSemua() {
      peta.clear();
    },
  };
}

/** Batas login dan ganti kata sandi: 5 gagal / 15 menit memblokir 15 menit (SECURITY §5). */
export const BATAS_GAGAL = {
  maksGagal: 5,
  jendelaMs: 15 * 60 * 1000,
  blokirMs: 15 * 60 * 1000,
} as const;

type NamaLimiter = 'login' | 'ganti-password';

const globalLimiter = globalThis as typeof globalThis & {
  __limiterUndian?: Partial<Record<NamaLimiter, LimiterGagal>>;
};

/**
 * Limiter bernama yang dipakai bersama seluruh bundle route. State disimpan di globalThis
 * karena Next.js dapat memuat modul yang sama lebih dari sekali.
 */
export function getLimiterGagal(nama: NamaLimiter): LimiterGagal {
  globalLimiter.__limiterUndian ??= {};
  const daftar = globalLimiter.__limiterUndian;
  daftar[nama] ??= buatLimiterGagal(BATAS_GAGAL);
  return daftar[nama];
}
