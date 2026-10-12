import 'server-only';

import ExcelJS from 'exceljs';

import { type Prisma } from '@/generated/prisma/client';
import {
  TAHUN_LUNAS,
  formatNop,
  isKodeAlasan,
  isoWib,
  netralkanSelExcel,
  normalizeNop,
  pesanAlasan,
  tafsirkanPencarian,
  tanggalWib,
  type FilterPeserta,
  type KodeAlasan,
  type KodeWilayah,
} from '@/lib/domain';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';

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
  alasan: KodeAlasan[];
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

/**
 * Kecamatan yang sudah dipetakan ke wilayah. Belum ada pemetaan sampai tiket 08, sehingga semua
 * kecamatan masih "belum dipetakan".
 */
async function petaKecamatanWilayah(_periodeId: string): Promise<Map<string, KodeWilayah>> {
  return Promise.resolve(new Map<string, KodeWilayah>());
}

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
    alasan: b.alasan.filter(isKodeAlasan),
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
  if (filter.q !== undefined) {
    const cari = tafsirkanPencarian(filter.q);
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
  const [total, baris] = await Promise.all([
    db.peserta.count({ where }),
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
  const baris = await getDb().peserta.findMany({
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
