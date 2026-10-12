import 'server-only';

import { Prisma } from '@/generated/prisma/client';
import {
  BATAS_LUNAS_BAWAAN,
  KODE_WILAYAH,
  NAMA_WILAYAH_BAWAAN,
  PESAN_PERIODE_DITOLAK,
  TAHUN_PAJAK,
  buatSlugPeriode,
  isoWib,
  periksaBatalPeriode,
  periksaUbahPeriode,
  type AlasanPeriodeDitolak,
  type BatalPeriode,
  type BuatPeriode,
  type KodeWilayah,
  type StatusPeriode,
  type UbahPeriode,
} from '@/lib/domain';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb, type DbClient } from '@/server/db';
import { AppError } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';

/** Baris daftar periode (API.md GET /api/periode). */
export type PeriodeRingkas = {
  id: string;
  slug: string;
  judul: string;
  status: StatusPeriode;
  batasLunas: string;
  tanggalAcara: string | null;
  lokasiAcara: string | null;
  version: number;
};

/** Detail periode (API.md GET /api/periode/:id). */
export type PeriodeDetail = PeriodeRingkas & {
  tahunAwal: number;
  tahunAkhir: number;
  wilayah: { kode: KodeWilayah; nama: string; jumlahLolos: number }[];
  /** Diisi tiket kunci snapshot (10). */
  snapshot: null;
  /** Diisi tiket unggah hasil (15). */
  hasil: null;
  publishedAt: string | null;
  alasanBatal: string | null;
  createdAt: string;
  updatedAt: string;
};

const PILIH_RINGKAS = {
  id: true,
  slug: true,
  judul: true,
  status: true,
  batasLunas: true,
  tanggalAcara: true,
  lokasiAcara: true,
  version: true,
} as const satisfies Prisma.PeriodeSelect;

const PILIH_DETAIL = {
  ...PILIH_RINGKAS,
  tahunAwal: true,
  tahunAkhir: true,
  publishedAt: true,
  alasanBatal: true,
  createdAt: true,
  updatedAt: true,
  wilayah: { select: { kode: true, nama: true }, orderBy: { kode: 'asc' } },
} as const satisfies Prisma.PeriodeSelect;

type BarisRingkas = Prisma.PeriodeGetPayload<{ select: typeof PILIH_RINGKAS }>;
type BarisDetail = Prisma.PeriodeGetPayload<{ select: typeof PILIH_DETAIL }>;

/** Kolom `date` disimpan sebagai tengah malam UTC; dibaca kembali sebagai `YYYY-MM-DD`. */
function keKolomTanggal(tanggal: string): Date {
  return new Date(`${tanggal}T00:00:00Z`);
}

function dariKolomTanggal(tanggal: Date | null): string | null {
  return tanggal === null ? null : tanggal.toISOString().slice(0, 10);
}

function keRingkas(baris: BarisRingkas): PeriodeRingkas {
  return {
    ...baris,
    batasLunas: isoWib(baris.batasLunas),
    tanggalAcara: dariKolomTanggal(baris.tanggalAcara),
  };
}

function keDetail(baris: BarisDetail): PeriodeDetail {
  return {
    ...keRingkas(baris),
    tahunAwal: baris.tahunAwal,
    tahunAkhir: baris.tahunAkhir,
    // Jumlah peserta lolos per wilayah dihitung setelah ada impor dan pemetaan (tiket 05, 08).
    wilayah: baris.wilayah.map((w) => ({ kode: w.kode, nama: w.nama, jumlahLolos: 0 })),
    snapshot: null,
    hasil: null,
    publishedAt: baris.publishedAt === null ? null : isoWib(baris.publishedAt),
    alasanBatal: baris.alasanBatal,
    createdAt: isoWib(baris.createdAt),
    updatedAt: isoWib(baris.updatedAt),
  };
}

const STATUS_TIDAK_AKTIF: StatusPeriode[] = ['DIPUBLIKASI', 'DIBATALKAN'];

function galatTidakDitemukan(): AppError {
  return new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
}

function galatVersiBasi(versionSekarang: number): AppError {
  return new AppError(
    'CONFLICT',
    409,
    'Periode ini baru saja diubah orang lain. Muat ulang lalu coba lagi.',
    { version: versionSekarang },
  );
}

function galatStatus(status: StatusPeriode, alasan: AlasanPeriodeDitolak): AppError {
  return new AppError('PERIODE_TERKUNCI', 409, PESAN_PERIODE_DITOLAK[alasan], { status, alasan });
}

/**
 * Kunci transaksi pembuatan periode: dua Admin yang menekan "Simpan" bersamaan diproses
 * bergiliran sehingga yang kedua mendapat pesan yang jelas, bukan galat constraint mentah.
 * Index unik parsial `periode_satu_aktif` tetap menjadi penjaga terakhir di database.
 */
async function kunciPembuatanPeriode(tx: DbClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('periode:satu-aktif'))`;
}

function galatPeriodeAktif(aktif: { id: string; judul: string; status: StatusPeriode }): AppError {
  return new AppError(
    'PERIODE_AKTIF_SUDAH_ADA',
    409,
    `Masih ada periode aktif: ${aktif.judul}. Publikasikan atau batalkan periode tersebut dulu.`,
    { periodeId: aktif.id, judul: aktif.judul, status: aktif.status },
  );
}

/** Semua periode, terbaru di atas (dasbor). */
export async function daftarPeriode(): Promise<PeriodeRingkas[]> {
  const baris = await getDb().periode.findMany({
    select: PILIH_RINGKAS,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return baris.map(keRingkas);
}

/** Detail satu periode, atau null bila tidak ada (halaman memanggil `notFound()`). */
export async function cariPeriode(id: string): Promise<PeriodeDetail | null> {
  const baris = await getDb().periode.findUnique({ where: { id }, select: PILIH_DETAIL });
  return baris === null ? null : keDetail(baris);
}

/** Detail satu periode; 404 bila tidak ada. */
export async function ambilPeriode(id: string): Promise<PeriodeDetail> {
  const periode = await cariPeriode(id);
  if (periode === null) {
    throw galatTidakDitemukan();
  }
  return periode;
}

/**
 * Membuat periode Draf beserta dua wilayahnya (UX_FLOWS Flow 2). Ditolak dengan
 * `PERIODE_AKTIF_SUDAH_ADA` bila masih ada periode yang belum Dipublikasi/Dibatalkan.
 */
export async function buatPeriode(masukan: {
  aktor: PenggunaSesi;
  data: BuatPeriode;
  konteks: KonteksRequest;
}): Promise<PeriodeDetail> {
  const { aktor, data, konteks } = masukan;
  try {
    return await getDb().$transaction(async (tx) => {
      await kunciPembuatanPeriode(tx);
      const aktif = await tx.periode.findFirst({
        where: { status: { notIn: STATUS_TIDAK_AKTIF } },
        select: { id: true, judul: true, status: true },
      });
      if (aktif !== null) {
        throw galatPeriodeAktif(aktif);
      }
      const awalanSlug = `undian-umroh-${TAHUN_PAJAK.akhir.toString()}`;
      const slugTerpakai = await tx.periode.findMany({
        where: { slug: { startsWith: awalanSlug } },
        select: { slug: true },
      });
      const namaWilayah = {
        W1: data.namaWilayah?.W1 ?? NAMA_WILAYAH_BAWAAN.W1,
        W2: data.namaWilayah?.W2 ?? NAMA_WILAYAH_BAWAAN.W2,
      };
      const baru = await tx.periode.create({
        data: {
          slug: buatSlugPeriode(
            TAHUN_PAJAK.akhir,
            slugTerpakai.map((s) => s.slug),
          ),
          judul: data.judul,
          tahunAwal: TAHUN_PAJAK.awal,
          tahunAkhir: TAHUN_PAJAK.akhir,
          batasLunas: new Date(data.batasLunas),
          tanggalAcara:
            data.tanggalAcara === undefined || data.tanggalAcara === null
              ? null
              : keKolomTanggal(data.tanggalAcara),
          lokasiAcara: data.lokasiAcara ?? null,
          createdById: aktor.id,
          wilayah: { create: KODE_WILAYAH.map((kode) => ({ kode, nama: namaWilayah[kode] })) },
        },
        select: PILIH_DETAIL,
      });
      await audit(tx, {
        aksi: 'PERIODE_BUAT',
        aktor,
        targetTipe: 'periode',
        targetId: baru.id,
        payload: {
          judul: baru.judul,
          slug: baru.slug,
          batasLunas: isoWib(baru.batasLunas),
          batasLunasBawaan: isoWib(baru.batasLunas) === BATAS_LUNAS_BAWAAN,
          namaWilayah,
        },
        konteks,
      });
      return keDetail(baru);
    });
  } catch (error) {
    // Penjaga terakhir: index `periode_satu_aktif` menolak periode aktif kedua.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(
        'PERIODE_AKTIF_SUDAH_ADA',
        409,
        'Masih ada periode aktif. Publikasikan atau batalkan periode tersebut dulu.',
      );
    }
    throw error;
  }
}

type Perbandingan = Record<string, { lama: string | null; baru: string | null }>;

/** Field periode yang benar-benar berubah, untuk data update dan payload audit. */
function bandingkanPeriode(
  lama: BarisDetail,
  perubahan: UbahPeriode,
): { data: Prisma.PeriodeUpdateManyMutationInput; beda: Perbandingan } {
  const data: Prisma.PeriodeUpdateManyMutationInput = {};
  const beda: Perbandingan = {};
  if (perubahan.judul !== undefined && perubahan.judul !== lama.judul) {
    data.judul = perubahan.judul;
    beda.judul = { lama: lama.judul, baru: perubahan.judul };
  }
  if (perubahan.batasLunas !== undefined) {
    const baru = new Date(perubahan.batasLunas);
    if (baru.getTime() !== lama.batasLunas.getTime()) {
      data.batasLunas = baru;
      beda.batasLunas = { lama: isoWib(lama.batasLunas), baru: isoWib(baru) };
    }
  }
  const tanggalLama = dariKolomTanggal(lama.tanggalAcara);
  if (perubahan.tanggalAcara !== undefined && perubahan.tanggalAcara !== tanggalLama) {
    data.tanggalAcara =
      perubahan.tanggalAcara === null ? null : keKolomTanggal(perubahan.tanggalAcara);
    beda.tanggalAcara = { lama: tanggalLama, baru: perubahan.tanggalAcara };
  }
  if (perubahan.lokasiAcara !== undefined && perubahan.lokasiAcara !== lama.lokasiAcara) {
    data.lokasiAcara = perubahan.lokasiAcara;
    beda.lokasiAcara = { lama: lama.lokasiAcara, baru: perubahan.lokasiAcara };
  }
  return { data, beda };
}

/** Nama wilayah yang berubah, per kode. */
function bandingkanWilayah(lama: BarisDetail, perubahan: UbahPeriode): Perbandingan {
  const beda: Perbandingan = {};
  for (const kode of KODE_WILAYAH) {
    const baru = perubahan.namaWilayah?.[kode];
    const sekarang = lama.wilayah.find((w) => w.kode === kode)?.nama ?? null;
    if (baru !== undefined && baru !== sekarang) {
      beda[kode] = { lama: sekarang, baru };
    }
  }
  return beda;
}

/**
 * Mengubah periode dengan optimistic concurrency. Perubahan tanpa efek tidak menulis apa pun.
 * Update bersyarat `id + version + status` memastikan transisi status yang berjalan bersamaan
 * (mis. kunci) tidak tertimpa (DATABASE §7).
 */
export async function ubahPeriode(masukan: {
  aktor: PenggunaSesi;
  id: string;
  perubahan: UbahPeriode;
  konteks: KonteksRequest;
}): Promise<PeriodeDetail> {
  const { aktor, id, perubahan, konteks } = masukan;
  return getDb().$transaction(async (tx) => {
    const lama = await tx.periode.findUnique({ where: { id }, select: PILIH_DETAIL });
    if (lama === null) {
      throw galatTidakDitemukan();
    }
    const aturan = periksaUbahPeriode(lama.status, perubahan);
    if (!aturan.ok) {
      throw galatStatus(lama.status, aturan.error);
    }
    if (lama.version !== perubahan.version) {
      throw galatVersiBasi(lama.version);
    }

    const { data, beda } = bandingkanPeriode(lama, perubahan);
    const bedaWilayah = bandingkanWilayah(lama, perubahan);
    if (Object.keys(beda).length === 0 && Object.keys(bedaWilayah).length === 0) {
      return keDetail(lama);
    }

    const hasil = await tx.periode.updateMany({
      where: { id, version: perubahan.version, status: lama.status },
      data: { ...data, version: { increment: 1 } },
    });
    if (hasil.count === 0) {
      throw galatVersiBasi(lama.version);
    }
    for (const [kode, { baru }] of Object.entries(bedaWilayah)) {
      await tx.wilayah.update({
        where: { periodeId_kode: { periodeId: id, kode: kode as KodeWilayah } },
        data: { nama: baru ?? '' },
      });
    }

    if (Object.keys(beda).length > 0) {
      await audit(tx, {
        aksi: 'PERIODE_UBAH',
        aktor,
        targetTipe: 'periode',
        targetId: id,
        payload: { perubahan: beda },
        konteks,
      });
    }
    if (Object.keys(bedaWilayah).length > 0) {
      await audit(tx, {
        aksi: 'WILAYAH_NAMA_UBAH',
        aktor,
        targetTipe: 'periode',
        targetId: id,
        payload: { perubahan: bedaWilayah },
        konteks,
      });
    }
    return keDetail(await tx.periode.findUniqueOrThrow({ where: { id }, select: PILIH_DETAIL }));
  });
}

/**
 * Membatalkan periode Draf atau Terkunci dengan alasan wajib (DECISIONS 016). Status Dibatalkan
 * final dan membebaskan aturan satu periode aktif sehingga periode baru dapat dibuat.
 */
export async function batalkanPeriode(masukan: {
  aktor: PenggunaSesi;
  id: string;
  data: BatalPeriode;
  konteks: KonteksRequest;
}): Promise<PeriodeDetail> {
  const { aktor, id, data, konteks } = masukan;
  return getDb().$transaction(async (tx) => {
    const lama = await tx.periode.findUnique({ where: { id }, select: PILIH_DETAIL });
    if (lama === null) {
      throw galatTidakDitemukan();
    }
    const aturan = periksaBatalPeriode(lama.status);
    if (!aturan.ok) {
      throw galatStatus(lama.status, aturan.error);
    }
    if (lama.version !== data.version) {
      throw galatVersiBasi(lama.version);
    }
    const hasil = await tx.periode.updateMany({
      where: { id, version: data.version, status: lama.status },
      data: { status: 'DIBATALKAN', alasanBatal: data.alasan, version: { increment: 1 } },
    });
    if (hasil.count === 0) {
      throw galatVersiBasi(lama.version);
    }
    await audit(tx, {
      aksi: 'PERIODE_BATAL',
      aktor,
      targetTipe: 'periode',
      targetId: id,
      payload: { judul: lama.judul, statusSebelumnya: lama.status, alasan: data.alasan },
      konteks,
    });
    return keDetail(await tx.periode.findUniqueOrThrow({ where: { id }, select: PILIH_DETAIL }));
  });
}
