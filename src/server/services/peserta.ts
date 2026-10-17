import 'server-only';

import ExcelJS from 'exceljs';

import { type Prisma } from '@/generated/prisma/client';
import { z } from 'zod';

import {
  TAHUN_LUNAS,
  formatNop,
  isKodeAlasan,
  isoWib,
  maskNop,
  netralkanSelExcel,
  normalizeNop,
  pesanAlasan,
  tafsirkanPencarian,
  tanggalWib,
  type FilterPeserta,
  type GugurkanPeserta,
  type KodeAlasan,
  type KodeWilayah,
} from '@/lib/domain';

export const GugurkanPesertaSchema = z.strictObject({
  alasan: z
    .string({ error: 'Alasan gugur wajib diisi.' })
    .trim()
    .min(3, 'Alasan gugur minimal 3 karakter.')
    .max(500, 'Alasan gugur maksimal 500 karakter.'),
});
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';
import { petaKecamatanWilayah } from '@/server/services/wilayah';

/** Satu baris tabel peserta admin (API.md GET /api/periode/:id/peserta). Tanpa NIK utuh. */
export type PesertaApi = {
  id: string;
  baris: number;
  nop: string;
  nopFormat: string;
  nikMasked: string;
  nama: string;
  kecamatan: string;
  kelurahan: string;
  lunas: Record<string, string | null>;
  lunasRaw: Record<string, string>;
  eligible: boolean;
  alasan: string[];
  wilayah: KodeWilayah | null;
};

export type HalamanPeserta = {
  items: PesertaApi[];
  page: number;
  pageSize: number;
  total: number;
};

/** Kolom yang boleh keluar ke tabel admin; `nikEnc` sengaja tidak pernah dipilih (SECURITY §6). */
const PILIH_PESERTA = {
  id: true,
  baris: true,
  nop: true,
  nikMasked: true,
  nama: true,
  kecamatan: true,
  kelurahan: true,
  lunas2022: true,
  lunas2023: true,
  lunas2024: true,
  lunas2025: true,
  lunas2026: true,
  lunasRaw: true,
  eligible: true,
  alasan: true,
} as const satisfies Prisma.PesertaSelect;

type BarisPeserta = Prisma.PesertaGetPayload<{ select: typeof PILIH_PESERTA }>;

const KOLOM_LUNAS = {
  2022: 'lunas2022',
  2023: 'lunas2023',
  2024: 'lunas2024',
  2025: 'lunas2025',
  2026: 'lunas2026',
} as const;

function teksLunasRaw(nilai: Prisma.JsonValue): Record<string, string> {
  const hasil: Record<string, string> = {};
  if (nilai !== null && typeof nilai === 'object' && !Array.isArray(nilai)) {
    for (const tahun of TAHUN_LUNAS) {
      const isi = nilai[tahun.toString()];
      hasil[tahun.toString()] = typeof isi === 'string' ? isi : '';
    }
  }
  return hasil;
}

function keApi(b: BarisPeserta, peta: Map<string, KodeWilayah>): PesertaApi {
  const nop = normalizeNop(b.nop);
  const lunas: Record<string, string | null> = {};
  for (const tahun of TAHUN_LUNAS) {
    const waktu = b[KOLOM_LUNAS[tahun]];
    lunas[tahun.toString()] = waktu === null ? null : isoWib(waktu);
  }
  return {
    id: b.id,
    baris: b.baris,
    nop: b.nop,
    nopFormat: nop.ok ? formatNop(nop.value) : b.nop,
    nikMasked: b.nikMasked,
    nama: b.nama,
    kecamatan: b.kecamatan,
    kelurahan: b.kelurahan,
    lunas,
    lunasRaw: teksLunasRaw(b.lunasRaw),
    eligible: b.eligible,
    alasan: b.alasan,
    wilayah: peta.get(b.kecamatan) ?? null,
  };
}

async function pastikanPeriode(periodeId: string): Promise<{ slug: string }> {
  const periode = await getDb().periode.findUnique({
    where: { id: periodeId },
    select: { slug: true },
  });
  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }
  return periode;
}

function kondisi(
  periodeId: string,
  filter: FilterPeserta,
  peta: Map<string, KodeWilayah>,
): Prisma.PesertaWhereInput {
  const where: Prisma.PesertaWhereInput = { periodeId };
  if (filter.status !== undefined) where.eligible = filter.status === 'lolos';
  if (filter.alasan !== undefined) where.alasan = { has: filter.alasan };
  const syaratKecamatan: Prisma.StringFilter[] = [];
  if (filter.kecamatan !== undefined) syaratKecamatan.push({ equals: filter.kecamatan });
  if (filter.wilayah !== undefined) {
    const dipetakan = [...peta.entries()];
    syaratKecamatan.push(
      filter.wilayah === 'BELUM_DIPETAKAN'
        ? { notIn: dipetakan.map(([k]) => k) }
        : { in: dipetakan.filter(([, w]) => w === filter.wilayah).map(([k]) => k) },
    );
  }
  if (syaratKecamatan.length > 0) {
    where.AND = syaratKecamatan.map((s) => ({ kecamatan: s }));
  }
  if (filter.q !== undefined && filter.q.trim() !== '') {
    const raw = filter.q.trim();
    const cari = tafsirkanPencarian(raw);
    if ('nopAwalan' in cari) {
      where.nop = { startsWith: cari.nopAwalan };
    } else {
      where.nama = { startsWith: cari.namaAwalan, mode: 'insensitive' };
    }
  }
  return where;
}

/** Peserta impor aktif periode dengan filter dan paginasi, terurut nomor baris file. */
export async function daftarPeserta(
  periodeId: string,
  filter: FilterPeserta,
): Promise<HalamanPeserta> {
  await pastikanPeriode(periodeId);
  const peta = await petaKecamatanWilayah(periodeId);
  const where = kondisi(periodeId, filter, peta);
  const db = getDb();

  // Optimasi: jika tanpa filter rinci (hanya filter status lolos/gugur atau tanpa filter),
  // gunakan total dari metadata impor aktif agar tidak melakukan count(*) pada ratusan ribu baris.
  const tanpaFilterRinci =
    filter.alasan === undefined &&
    filter.kecamatan === undefined &&
    filter.wilayah === undefined &&
    filter.q === undefined;

  let totalPromise: Promise<number>;
  if (tanpaFilterRinci) {
    totalPromise = (async () => {
      const aktif = await db.impor.findFirst({
        where: { periodeId, aktif: true },
        select: { totalBaris: true, jumlahLolos: true, jumlahGugur: true },
      });
      if (aktif !== null) {
        if (filter.status === 'lolos') return aktif.jumlahLolos;
        if (filter.status === 'gugur') return aktif.jumlahGugur;
        return aktif.totalBaris;
      }
      return db.peserta.count({ where });
    })();
  } else {
    totalPromise = db.peserta.count({ where });
  }

  const [total, baris] = await Promise.all([
    totalPromise,
    db.peserta.findMany({
      where,
      orderBy: { baris: 'asc' },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      select: PILIH_PESERTA,
    }),
  ]);
  return {
    items: baris.map((b) => keApi(b, peta)),
    page: filter.page,
    pageSize: filter.pageSize,
    total,
  };
}

/** Kecamatan (ternormalisasi) yang muncul di data periode, untuk pilihan filter. */
export async function daftarKecamatanPeserta(periodeId: string): Promise<string[]> {
  const db = getDb();
  // Optimasi: baca dari tabel kecamatanWilayah (hanya ~19 baris) daripada SELECT DISTINCT pada 100k+ baris peserta
  const dariWilayah = await db.kecamatanWilayah.findMany({
    where: { periodeId, kecamatan: { not: '' } },
    select: { kecamatan: true },
    orderBy: { kecamatan: 'asc' },
  });
  if (dariWilayah.length > 0) {
    return dariWilayah.map((b) => b.kecamatan);
  }
  const baris = await db.peserta.findMany({
    where: { periodeId, kecamatan: { not: '' } },
    distinct: ['kecamatan'],
    select: { kecamatan: true },
    orderBy: { kecamatan: 'asc' },
  });
  return baris.map((b) => b.kecamatan);
}

const JUDUL_KOLOM_EKSPOR = [
  'Baris',
  'NOP',
  'NIK (tersamar)',
  'Nama',
  'Kecamatan',
  'Kelurahan',
  ...TAHUN_LUNAS.map((t) => `Tanggal Lunas ${t.toString()}`),
  'Kode Alasan',
  'Pesan Alasan',
];

/**
 * Ekspor daftar gugur ke Excel (API.md …/peserta/ekspor-gugur) untuk menjawab pertanyaan wajib
 * pajak. Nilai tanggal ditulis apa adanya dari file; setiap teks dinetralkan dari rumus
 * (SECURITY §8). NIK hanya tersamar. Setiap unduhan tercatat `EKSPOR_UNDUH`.
 */
export async function eksporDaftarGugur(masukan: {
  aktor: PenggunaSesi;
  periodeId: string;
  konteks: KonteksRequest;
  sekarang?: Date;
}): Promise<{ namaFile: string; isi: Uint8Array<ArrayBuffer> }> {
  const { aktor, periodeId, konteks } = masukan;
  const periode = await pastikanPeriode(periodeId);
  const baris = await getDb().peserta.findMany({
    where: { periodeId, eligible: false },
    orderBy: { baris: 'asc' },
    select: {
      baris: true,
      nop: true,
      nikMasked: true,
      nama: true,
      kecamatan: true,
      kelurahan: true,
      lunasRaw: true,
      alasan: true,
    },
  });

  const buku = new ExcelJS.Workbook();
  buku.creator = 'Undian Umroh PBB OKU Selatan';
  const lembar = buku.addWorksheet('Daftar Gugur');
  lembar.addRow(JUDUL_KOLOM_EKSPOR).font = { bold: true };
  lembar.views = [{ state: 'frozen', ySplit: 1 }];
  for (const b of baris) {
    const nop = normalizeNop(b.nop);
    const raw = teksLunasRaw(b.lunasRaw);
    const alasan = b.alasan.filter(isKodeAlasan);
    lembar.addRow([
      b.baris,
      ...[
        nop.ok ? formatNop(nop.value) : b.nop,
        b.nikMasked,
        b.nama,
        b.kecamatan,
        b.kelurahan,
        ...TAHUN_LUNAS.map((t) => raw[t.toString()] ?? ''),
        alasan.join(', '),
        alasan.map(pesanAlasan).join(' '),
      ].map(netralkanSelExcel),
    ]);
  }
  lembar.columns.forEach((kolom, indeks) => {
    kolom.width = indeks === 0 ? 8 : indeks === JUDUL_KOLOM_EKSPOR.length - 1 ? 60 : 22;
  });
  const isi = new Uint8Array(await buku.xlsx.writeBuffer());

  await getDb().$transaction(async (tx) => {
    await audit(tx, {
      aksi: 'EKSPOR_UNDUH',
      aktor,
      targetTipe: 'periode',
      targetId: periodeId,
      payload: { jenis: 'DAFTAR_GUGUR', jumlahBaris: baris.length },
      konteks,
    });
  });
  const tanggal = tanggalWib(masukan.sekarang ?? new Date()).replaceAll('-', '');
  return { namaFile: `daftar-gugur-${periode.slug}-${tanggal}.xlsx`, isi };
}

export type HasilCekNopPublik =
  | {
      status: 'NOP_INVALID';
      pesan: string;
    }
  | {
      status: 'BELUM_ADA_DATA';
      pesan: string;
    }
  | {
      status: 'TIDAK_DITEMUKAN';
      nopMasked: string;
      pesan: string;
    }
  | {
      status: 'IKUT';
      nopMasked: string;
      nama: string;
      wilayah: string;
      kodeWilayah: string | null;
      sementara: boolean;
      labelSementara: string | null;
    }
  | {
      status: 'TIDAK_IKUT';
      nopMasked: string;
      nama: string;
      alasan: string[];
      petunjuk: string;
      sementara: boolean;
      labelSementara: string | null;
    };

/**
 * Cek status kepesertaan NOP secara publik (PRD F10, API.md /api/publik/cek, SECURITY §5, §6).
 * Memilih kolom secara eksplisit, tidak pernah memuat NIK, alamat lengkap, atau NOP utuh.
 */
export async function cekNopPublik(nopInput: string): Promise<HasilCekNopPublik> {
  const normalisasi = normalizeNop(nopInput);
  if (!normalisasi.ok) {
    return {
      status: 'NOP_INVALID',
      pesan: 'NOP harus 18 digit angka.',
    };
  }

  const db = getDb();
  const nopClean = normalisasi.value;

  // Cari periode aktif selain yang dibatalkan
  const periode = await db.periode.findFirst({
    where: { status: { not: 'DIBATALKAN' } },
    orderBy: { createdAt: 'desc' },
    include: {
      impor: {
        where: { aktif: true },
        take: 1,
      },
    },
  });

  if (!periode || periode.impor.length === 0) {
    return {
      status: 'BELUM_ADA_DATA',
      pesan: 'Data peserta belum tersedia untuk diperiksa.',
    };
  }

  // Kueri peserta dengan memilih kolom eksplisit (SECURITY §6)
  const peserta = await db.peserta.findFirst({
    where: {
      periodeId: periode.id,
      impor: { aktif: true },
      nop: nopClean,
    },
    select: {
      nop: true,
      nama: true,
      eligible: true,
      alasan: true,
      kecamatan: true,
    },
  });

  if (!peserta) {
    return {
      status: 'TIDAK_DITEMUKAN',
      nopMasked: maskNop(nopClean),
      pesan:
        'NOP tidak terdaftar dalam database peserta. Silakan hubungi kantor Bapenda OKU Selatan dengan membawa bukti pembayaran PBB-P2 Anda.',
    };
  }

  const pemetaan = await db.kecamatanWilayah.findUnique({
    where: {
      periodeId_kecamatan: {
        periodeId: periode.id,
        kecamatan: peserta.kecamatan,
      },
    },
    include: { wilayah: true },
  });

  const sementara = periode.status === 'DRAF';
  const labelSementara = sementara
    ? 'Hasil sementara. Daftar peserta final ditetapkan saat data dikunci.'
    : null;

  if (peserta.eligible) {
    const namaWilayah = pemetaan?.wilayah?.nama ?? 'Wilayah Terdaftar';
    return {
      status: 'IKUT',
      nopMasked: maskNop(peserta.nop),
      nama: peserta.nama,
      wilayah: namaWilayah,
      kodeWilayah: pemetaan?.wilayah?.kode ?? null,
      sementara,
      labelSementara,
    };
  }

  const daftarAlasanTeks = peserta.alasan.map((kode) =>
    isKodeAlasan(kode) ? pesanAlasan(kode) : kode,
  );

  return {
    status: 'TIDAK_IKUT',
    nopMasked: maskNop(peserta.nop),
    nama: peserta.nama,
    alasan: daftarAlasanTeks.length > 0 ? daftarAlasanTeks : ['Belum memenuhi kriteria pelunasan PBB-P2.'],
    petunjuk:
      'Silakan hubungi kantor Bapenda OKU Selatan dengan membawa bukti pembayaran asli PBB-P2 Anda untuk klarifikasi lebih lanjut.',
    sementara,
    labelSementara,
  };
}

/** Menggugurkan peserta yang lolos dengan mencatat alasan diskualifikasi manual oleh admin. */
export async function gugurkanPeserta(masukan: {
  periodeId: string;
  pesertaId: string;
  data: GugurkanPeserta;
  aktor: PenggunaSesi;
  konteks?: KonteksRequest;
}): Promise<PesertaApi> {
  const { periodeId, pesertaId, data, aktor, konteks } = masukan;
  const db = getDb();

  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    select: { id: true, status: true },
  });

  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }

  if (periode.status !== 'DRAF') {
    throw new AppError(
      'STATUS_PERIODE_TIDAK_VALID',
      409,
      'Status kepesertaan hanya dapat diubah saat periode berstatus DRAF. Buka kunci terlebih dahulu jika data terkunci.',
      { status: periode.status },
    );
  }

  const peserta = await db.peserta.findFirst({
    where: { id: pesertaId, periodeId },
    select: {
      id: true,
      imporId: true,
      nop: true,
      nama: true,
      eligible: true,
      alasan: true,
    },
  });

  if (peserta === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Peserta tidak ditemukan dalam periode ini.');
  }

  if (!peserta.eligible) {
    throw new AppError('AKSI_TIDAK_VALID', 400, 'Peserta ini sudah berstatus gugur.');
  }

  const alasanBaru = `DISKUALIFIKASI_MANUAL: ${data.alasan}`;

  const { updated, peta } = await db.$transaction(async (tx) => {
    const hasil = await tx.peserta.update({
      where: { id: pesertaId },
      data: {
        eligible: false,
        alasan: {
          push: alasanBaru,
        },
      },
      select: PILIH_PESERTA,
    });

    await tx.impor.update({
      where: { id: peserta.imporId },
      data: {
        jumlahLolos: { decrement: 1 },
        jumlahGugur: { increment: 1 },
      },
    });

    await audit(tx, {
      aksi: 'PESERTA_GUGUR',
      aktor,
      targetTipe: 'peserta',
      targetId: pesertaId,
      payload: {
        periodeId,
        nop: peserta.nop,
        nama: peserta.nama,
        alasan: data.alasan,
      },
      konteks,
    });

    const petaWilayah = await petaKecamatanWilayah(periodeId, tx);
    return { updated: hasil, peta: petaWilayah };
  });

  return keApi(updated, peta);
}

