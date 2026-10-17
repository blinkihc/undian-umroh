import { type StatusPemenang } from '@/generated/prisma/client';
import { formatNop, maskNop } from '@/lib/domain/nop';
import { isoWib } from '@/lib/domain/waktu';
import { type KodeSlotPaket } from '@/lib/package/kontrak';
import {
  GugurInputSchema,
  hitungKenaikanCadangan,
  hitungStatusWilayah,
  LihatNikInputSchema,
  normalisasiKodeSlotDb,
  slotDbKePaket,
  type GugurInput,
  type LihatNikInput,
  type LihatNikRespons,
  type PemenangPeriodeRespons,
  type PesertaPemenangRespons,
  type RiwayatStatusRespons,
  type SlotPemenangRespons,
  type StatusWilayah,
  type VerifikasiInput,
  VerifikasiInputSchema,
  type WilayahPemenangRespons,
} from '@/lib/domain/pemenang';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { dekripsiNik } from '@/server/nik';
import { type KonteksRequest } from '@/server/request';

export type {
  LihatNikRespons,
  PemenangPeriodeRespons,
  PesertaPemenangRespons,
  RiwayatStatusRespons,
  SlotPemenangRespons,
  StatusWilayah,
  WilayahPemenangRespons,
};

/**
 * Mengambil daftar pemenang per wilayah untuk periode tertentu (API.md §Pemenang).
 */
export async function ambilPemenangPeriode(periodeId: string): Promise<PemenangPeriodeRespons> {
  const db = getDb();

  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    include: {
      wilayah: {
        orderBy: { kode: 'asc' },
      },
      slotHasil: {
        include: {
          peserta: true,
          riwayatStatus: {
            include: {
              oleh: {
                select: { nama: true },
              },
            },
            orderBy: { at: 'desc' },
          },
        },
        orderBy: { urutan: 'asc' },
      },
    },
  });

  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }

  const slotW1 = periode.slotHasil.filter((s) => s.wilayah === 'W1');
  const slotW2 = periode.slotHasil.filter((s) => s.wilayah === 'W2');

  type SlotHasilTunggal = NonNullable<typeof periode>['slotHasil'][number];

  function petakanSlot(s: SlotHasilTunggal): SlotPemenangRespons {
    return {
      kode: slotDbKePaket(s.slot),
      status: s.status,
      penerimaAktif: s.penerimaAktif,
      ...(s.alasanGugur !== null && { alasanGugur: s.alasanGugur }),
      ...(s.catatan !== null && { catatan: s.catatan }),
      peserta: {
        nopFormat: formatNop(s.peserta.nop),
        nikMasked: s.peserta.nikMasked,
        nama: s.peserta.nama,
        alamatWp: s.peserta.alamatWp,
        alamatOp: s.peserta.alamatOp,
        kecamatan: s.peserta.kecamatan,
        kelurahan: s.peserta.kelurahan,
        lunas: s.peserta.lunasRaw as Record<string, string>,
      },
      version: s.version,
      riwayat: s.riwayatStatus.map((r) => ({
        id: r.id,
        dari: r.dari,
        ke: r.ke,
        alasanGugur: r.alasanGugur,
        catatan: r.catatan,
        oleh: r.oleh.nama,
        at: r.at.toISOString(),
      })),
    };
  }

  const w1Record = periode.wilayah.find((w) => w.kode === 'W1');
  const w2Record = periode.wilayah.find((w) => w.kode === 'W2');

  const formattedW1 = slotW1.map(petakanSlot);
  const formattedW2 = slotW2.map(petakanSlot);

  const statusW1 = hitungStatusWilayah(
    formattedW1.map((s) => ({ kode: s.kode, status: s.status, penerimaAktif: s.penerimaAktif })),
  );
  const statusW2 = hitungStatusWilayah(
    formattedW2.map((s) => ({ kode: s.kode, status: s.status, penerimaAktif: s.penerimaAktif })),
  );

  return {
    wilayah: [
      {
        kode: 'W1',
        nama: w1Record?.nama ?? 'Wilayah 1',
        statusWilayah: statusW1,
        slot: formattedW1,
      },
      {
        kode: 'W2',
        nama: w2Record?.nama ?? 'Wilayah 2',
        statusWilayah: statusW2,
        slot: formattedW2,
      },
    ],
  };
}

/**
 * Memverifikasi pemenang aktif (API.md §Pemenang, UX_FLOWS Flow 12).
 * Syarat: slot adalah penerima aktif dengan status MENANG.
 * Bila kedua wilayah berstatus TERVERIFIKASI, status periode otomatis menjadi FINAL.
 */
export async function verifikasiPemenang(
  periodeId: string,
  slotKodeRaw: string,
  rawBody: unknown,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
): Promise<PemenangPeriodeRespons> {
  const input: VerifikasiInput = VerifikasiInputSchema.parse(rawBody);
  const kodeDb = normalisasiKodeSlotDb(slotKodeRaw);
  if (kodeDb === null) {
    throw new AppError('SLOT_TIDAK_VALID', 400, `Kode slot ${slotKodeRaw} tidak valid.`);
  }

  const db = getDb();

  await db.$transaction(async (tx) => {
    const slot = await tx.slotHasil.findUnique({
      where: {
        periodeId_slot: {
          periodeId,
          slot: kodeDb,
        },
      },
      include: {
        periode: true,
      },
    });

    if (slot === null) {
      throw new AppError('TIDAK_DITEMUKAN', 404, 'Slot pemenang tidak ditemukan.');
    }

    if (slot.version !== input.version) {
      throw new AppError(
        'CONFLICT',
        409,
        'Status pemenang telah diubah oleh pengguna lain. Halaman dimuat ulang.',
      );
    }

    if (!slot.penerimaAktif || slot.status !== 'MENANG') {
      throw new AppError(
        'AKSI_TIDAK_VALID',
        400,
        'Hanya penerima aktif dengan status Menang yang dapat diverifikasi.',
      );
    }

    // Ubah status slot menjadi TERVERIFIKASI
    await tx.slotHasil.update({
      where: { id: slot.id },
      data: {
        status: 'TERVERIFIKASI',
        version: { increment: 1 },
        statusChangedById: aktor.id,
        statusChangedAt: new Date(),
      },
    });

    // Catat ke riwayat_status_pemenang
    await tx.riwayatStatusPemenang.create({
      data: {
        slotHasilId: slot.id,
        dari: 'MENANG',
        ke: 'TERVERIFIKASI',
        catatan: 'Terverifikasi oleh admin',
        olehId: aktor.id,
      },
    });

    // Catat log audit PEMENANG_VERIFIKASI
    await audit(tx, {
      aksi: 'PEMENANG_VERIFIKASI',
      targetTipe: 'slot_hasil',
      targetId: slot.id,
      payload: {
        periodeId,
        slot: slotDbKePaket(slot.slot),
        version: slot.version + 1,
      },
      aktor,
      konteks,
    });

    // Periksa apakah kedua wilayah kini sudah memiliki penerima TERVERIFIKASI
    const semuaSlot = await tx.slotHasil.findMany({
      where: { periodeId },
    });

    const w1Penerima = semuaSlot.find((s) => s.wilayah === 'W1' && s.penerimaAktif);
    const w2Penerima = semuaSlot.find((s) => s.wilayah === 'W2' && s.penerimaAktif);

    const w1Verified =
      (w1Penerima?.id === slot.id && true) || w1Penerima?.status === 'TERVERIFIKASI';
    const w2Verified =
      (w2Penerima?.id === slot.id && true) || w2Penerima?.status === 'TERVERIFIKASI';

    if (w1Verified && w2Verified && slot.periode.status === 'DIUNDI') {
      await tx.periode.update({
        where: { id: periodeId },
        data: {
          status: 'FINAL',
          version: { increment: 1 },
        },
      });

      await audit(tx, {
        aksi: 'PERIODE_UBAH',
        targetTipe: 'periode',
        targetId: periodeId,
        payload: {
          status: 'FINAL',
          alasan: 'Kedua wilayah memiliki pemenang terverifikasi',
        },
        aktor,
        konteks,
      });
    }
  });

  return ambilPemenangPeriode(periodeId);
}

/**
 * Menandai pemenang gugur dan mempromosikan cadangan berikutnya secara otomatis (API.md §Pemenang, PRD F8, DECISIONS 007).
 */
export async function tandaiGugurPemenang(
  periodeId: string,
  slotKodeRaw: string,
  rawBody: unknown,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
): Promise<PemenangPeriodeRespons> {
  const input: GugurInput = GugurInputSchema.parse(rawBody);
  const kodeDb = normalisasiKodeSlotDb(slotKodeRaw);
  if (kodeDb === null) {
    throw new AppError('SLOT_TIDAK_VALID', 400, `Kode slot ${slotKodeRaw} tidak valid.`);
  }

  const db = getDb();

  await db.$transaction(async (tx) => {
    const target = await tx.slotHasil.findUnique({
      where: {
        periodeId_slot: {
          periodeId,
          slot: kodeDb,
        },
      },
    });

    if (target === null) {
      throw new AppError('TIDAK_DITEMUKAN', 404, 'Slot pemenang tidak ditemukan.');
    }

    if (target.version !== input.version) {
      throw new AppError(
        'CONFLICT',
        409,
        'Status pemenang telah diubah oleh pengguna lain. Halaman dimuat ulang.',
      );
    }

    if (target.status === 'GUGUR') {
      throw new AppError(
        'AKSI_TIDAK_VALID',
        400,
        'Slot sudah berstatus Gugur dan tidak dapat diubah kembali.',
      );
    }

    // Ambil seluruh slot di wilayah yang sama untuk menentukan kenaikan cadangan
    const slotsWilayah = await tx.slotHasil.findMany({
      where: {
        periodeId,
        wilayah: target.wilayah,
      },
      orderBy: { urutan: 'asc' },
    });

    const ringkas = slotsWilayah.map((s) => ({
      kode: slotDbKePaket(s.slot),
      status: s.status,
      penerimaAktif: s.penerimaAktif,
    }));

    const hasilKenaikan = hitungKenaikanCadangan(ringkas, slotDbKePaket(target.slot));

    // Update slot target menjadi GUGUR
    await tx.slotHasil.update({
      where: { id: target.id },
      data: {
        status: 'GUGUR',
        penerimaAktif: false,
        alasanGugur: input.alasan,
        catatan: input.catatan,
        version: { increment: 1 },
        statusChangedById: aktor.id,
        statusChangedAt: new Date(),
      },
    });

    // Catat ke riwayat_status_pemenang
    await tx.riwayatStatusPemenang.create({
      data: {
        slotHasilId: target.id,
        dari: target.status,
        ke: 'GUGUR',
        alasanGugur: input.alasan,
        catatan: input.catatan,
        olehId: aktor.id,
      },
    });

    // Jika ada cadangan yang dipromosikan otomatis
    if (hasilKenaikan.promotedKode !== null) {
      const promotedDbKode = normalisasiKodeSlotDb(hasilKenaikan.promotedKode);
      const promotedSlot = slotsWilayah.find((s) => s.slot === promotedDbKode);

      if (promotedSlot !== undefined) {
        await tx.slotHasil.update({
          where: { id: promotedSlot.id },
          data: {
            status: 'MENANG',
            penerimaAktif: true,
            version: { increment: 1 },
            statusChangedById: aktor.id,
            statusChangedAt: new Date(),
          },
        });

        await tx.riwayatStatusPemenang.create({
          data: {
            slotHasilId: promotedSlot.id,
            dari: promotedSlot.status,
            ke: 'MENANG',
            catatan: `Naik otomatis menggantikan ${slotDbKePaket(target.slot)} yang gugur`,
            olehId: aktor.id,
          },
        });
      }
    }

    // Catat log audit PEMENANG_GUGUR
    await audit(tx, {
      aksi: 'PEMENANG_GUGUR',
      targetTipe: 'slot_hasil',
      targetId: target.id,
      payload: {
        periodeId,
        slot: slotDbKePaket(target.slot),
        alasan: input.alasan,
        catatan: input.catatan,
        dipromosikan: hasilKenaikan.promotedKode,
      },
      aktor,
      konteks,
    });
  });

  return ambilPemenangPeriode(periodeId);
}

/**
 * Mengintip NIK asli pemenang/cadangan berstatus kandidat (API.md §Pemenang, OBSERVABILITY §Audit Log).
 * Hanya untuk Admin, mewajibkan alasan, tidak di-cache, dan tercatat di audit.
 */
export async function lihatNikPemenang(
  periodeId: string,
  slotKodeRaw: string,
  rawBody: unknown,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
): Promise<LihatNikRespons> {
  const input: LihatNikInput = LihatNikInputSchema.parse(rawBody);
  const kodeDb = normalisasiKodeSlotDb(slotKodeRaw);
  if (kodeDb === null) {
    throw new AppError('SLOT_TIDAK_VALID', 400, `Kode slot ${slotKodeRaw} tidak valid.`);
  }

  const db = getDb();

  const slot = await db.slotHasil.findUnique({
    where: {
      periodeId_slot: {
        periodeId,
        slot: kodeDb,
      },
    },
    include: {
      peserta: true,
    },
  });

  if (slot === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Slot pemenang tidak ditemukan.');
  }

  let nikHasil = '';
  if (slot.peserta.nikEnc !== null) {
    nikHasil = dekripsiNik(slot.peserta.nikEnc);
  }

  // Catat log audit PEMENANG_LIHAT_NIK (tanpa mencatat NIK asli ke log)
  await audit(db, {
    aksi: 'PEMENANG_LIHAT_NIK',
    targetTipe: 'slot_hasil',
    targetId: slot.id,
    payload: {
      periodeId,
      slot: slotDbKePaket(slot.slot),
      alasan: input.alasan,
    },
    aktor,
    konteks,
  });

  return {
    nik: nikHasil,
  };
}

export type SlotPemenangPublik = {
  kode: KodeSlotPaket;
  status: StatusPemenang;
  penerimaAktif: boolean;
  diperbaruiAt: string | null;
  peserta: {
    nopMasked: string;
    nikMasked: string;
    nama: string;
    alamatWp: string;
    alamatOp: string;
    kecamatan: string;
    kelurahan: string;
    lunas: Record<string, string>;
  };
};

export type WilayahPemenangPublik = {
  kode: string;
  nama: string;
  status: StatusWilayah;
  slot: SlotPemenangPublik[];
};

export type PemenangPublikRespons =
  | {
      status: 'BELUM_DIUMUMKAN';
      pesan: string;
      periode?: { judul: string };
    }
  | {
      status: 'TIDAK_ADA_PERIODE';
      pesan: string;
    }
  | {
      status: 'DIPUBLIKASI';
      periode: {
        id: string;
        judul: string;
        tanggalAcara: string | null;
        lokasiAcara: string | null;
        publishedAt: string;
        updatedAt: string;
      };
      integritas: {
        snapshotHash: string | null;
        hasilHash: string | null;
        pesertaPerWilayah: Array<{
          kode: string;
          nama: string;
          jumlahPeserta: number;
        }>;
        totalPeserta: number;
      };
      wilayah: WilayahPemenangPublik[];
    };

/**
 * Mengambil data publik pemenang undian (PRD F10, API.md GET /api/publik/pemenang).
 * Menyembunyikan alasan gugur, menyamarkan NIK dan NOP, serta menampilkan hash integritas.
 */
export async function ambilPemenangPublik(): Promise<PemenangPublikRespons> {
  const db = getDb();

  // Cari periode yang dipublikasikan (terbaru)
  const periodePublik = await db.periode.findFirst({
    where: { status: 'DIPUBLIKASI' },
    orderBy: { publishedAt: 'desc' },
    include: {
      wilayah: {
        orderBy: { kode: 'asc' },
      },
      snapshot: true,
      hasilUndian: true,
      slotHasil: {
        include: {
          peserta: true,
          riwayatStatus: {
            orderBy: { at: 'desc' },
            take: 1,
          },
        },
        orderBy: { urutan: 'asc' },
      },
    },
  });

  if (!periodePublik) {
    // Periksa apakah ada periode aktif
    const periodeAktif = await db.periode.findFirst({
      where: { status: { notIn: ['DIPUBLIKASI', 'DIBATALKAN'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (periodeAktif) {
      return {
        status: 'BELUM_DIUMUMKAN',
        pesan: 'Hasil undian belum diumumkan. Pantau halaman ini setelah acara.',
        periode: { judul: periodeAktif.judul },
      };
    }

    return {
      status: 'TIDAK_ADA_PERIODE',
      pesan: 'Belum ada undian yang berjalan.',
    };
  }

  type SlotHasilTunggal = (typeof periodePublik)['slotHasil'][number];

  function petakanSlotPublik(s: SlotHasilTunggal): SlotPemenangPublik {
    const riwayatTerbaru = s.riwayatStatus[0];
    return {
      kode: slotDbKePaket(s.slot),
      status: s.status,
      penerimaAktif: s.penerimaAktif,
      diperbaruiAt: riwayatTerbaru ? isoWib(riwayatTerbaru.at) : null,
      peserta: {
        nopMasked: maskNop(s.peserta.nop),
        nikMasked: s.peserta.nikMasked,
        nama: s.peserta.nama,
        alamatWp: s.peserta.alamatWp,
        alamatOp: s.peserta.alamatOp,
        kecamatan: s.peserta.kecamatan,
        kelurahan: s.peserta.kelurahan,
        lunas: s.peserta.lunasRaw as Record<string, string>,
      },
    };
  }

  const slotW1 = periodePublik.slotHasil.filter((s) => s.wilayah === 'W1').map(petakanSlotPublik);
  const slotW2 = periodePublik.slotHasil.filter((s) => s.wilayah === 'W2').map(petakanSlotPublik);

  const statusW1 = hitungStatusWilayah(
    slotW1.map((s) => ({ kode: s.kode, status: s.status, penerimaAktif: s.penerimaAktif })),
  );
  const statusW2 = hitungStatusWilayah(
    slotW2.map((s) => ({ kode: s.kode, status: s.status, penerimaAktif: s.penerimaAktif })),
  );

  const w1Record = periodePublik.wilayah.find((w) => w.kode === 'W1');
  const w2Record = periodePublik.wilayah.find((w) => w.kode === 'W2');

  const jW1 = periodePublik.snapshot?.jumlahW1 ?? 0;
  const jW2 = periodePublik.snapshot?.jumlahW2 ?? 0;

  const rekapWilayah = periodePublik.wilayah.map((w) => ({
    kode: w.kode,
    nama: w.nama,
    jumlahPeserta: w.kode === 'W1' ? jW1 : jW2,
  }));

  const totalPeserta = rekapWilayah.reduce((a: number, b: { jumlahPeserta: number }) => a + b.jumlahPeserta, 0);

  return {
    status: 'DIPUBLIKASI',
    periode: {
      id: periodePublik.id,
      judul: periodePublik.judul,
      tanggalAcara: periodePublik.tanggalAcara
        ? periodePublik.tanggalAcara.toISOString().slice(0, 10)
        : null,
      lokasiAcara: periodePublik.lokasiAcara,
      publishedAt: isoWib(periodePublik.publishedAt ?? new Date()),
      updatedAt: isoWib(periodePublik.updatedAt),
    },
    integritas: {
      snapshotHash: periodePublik.snapshot?.hash ?? null,
      hasilHash: periodePublik.hasilUndian?.hasilHash ?? null,
      pesertaPerWilayah: rekapWilayah,
      totalPeserta,
    },
    wilayah: [
      {
        kode: 'W1',
        nama: w1Record?.nama ?? 'Wilayah 1',
        status: statusW1,
        slot: slotW1,
      },
      {
        kode: 'W2',
        nama: w2Record?.nama ?? 'Wilayah 2',
        status: statusW2,
        slot: slotW2,
      },
    ],
  };
}

