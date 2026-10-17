import 'server-only';

import {
  type BeritaAcaraInput,
  type BeritaAcaraRespons,
  type PanitiaItem,
  type SaksiItem,
} from '@/lib/domain/berita-acara';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { buatWorkbookAudit, buatWorkbookPemenang } from '@/server/excel/ekspor';
import { buatPdfBeritaAcara, type BeritaAcaraPdfData } from '@/server/pdf/berita-acara';
import { type KonteksRequest } from '@/server/request';
import { ambilPemenangPeriode } from './pemenang';

export type BeritaAcaraDetailRespons = BeritaAcaraRespons & {
  tersedia: boolean;
  pesan?: string;
  updatedAt?: string | null;
  updatedByNama?: string | null;
};

function isStatusBolehBeritaAcara(status: string): boolean {
  return status === 'DIUNDI' || status === 'FINAL' || status === 'DIPUBLIKASI';
}

/**
 * Mengambil konfigurasi formulir berita acara.
 */
export async function ambilBeritaAcara(periodeId: string): Promise<BeritaAcaraDetailRespons> {
  const db = getDb();
  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    select: {
      id: true,
      status: true,
      beritaAcara: {
        include: {
          updatedBy: {
            select: { nama: true },
          },
        },
      },
    },
  });

  if (!periode) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan');
  }

  const tersedia = isStatusBolehBeritaAcara(periode.status);

  if (!periode.beritaAcara) {
    return {
      tersedia,
      pesan: tersedia ? undefined : 'Tersedia setelah hasil undian diunggah.',
      nomor: '',
      tempat: '',
      hariTanggal: '',
      dasarKegiatan: '',
      panitia: [],
      saksi: [],
      version: 0,
      updatedAt: null,
      updatedByNama: null,
    };
  }

  const isi = periode.beritaAcara.isi as {
    nomor?: string;
    tempat?: string;
    hariTanggal?: string;
    dasarKegiatan?: string;
    panitia?: PanitiaItem[];
    saksi?: SaksiItem[];
  };

  return {
    tersedia,
    pesan: tersedia ? undefined : 'Tersedia setelah hasil undian diunggah.',
    nomor: isi.nomor ?? '',
    tempat: isi.tempat ?? '',
    hariTanggal: isi.hariTanggal ?? '',
    dasarKegiatan: isi.dasarKegiatan ?? '',
    panitia: Array.isArray(isi.panitia) ? isi.panitia : [],
    saksi: Array.isArray(isi.saksi) ? isi.saksi : [],
    version: periode.beritaAcara.version,
    updatedAt: periode.beritaAcara.updatedAt.toISOString(),
    updatedByNama: periode.beritaAcara.updatedBy.nama,
  };
}

/**
 * Menyimpan formulir berita acara dengan optimistic concurrency control (version).
 */
export async function simpanBeritaAcara(
  periodeId: string,
  input: BeritaAcaraInput,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
): Promise<BeritaAcaraDetailRespons> {
  const db = getDb();

  return await db.$transaction(async (tx) => {
    const periode = await tx.periode.findUnique({
      where: { id: periodeId },
      include: {
        beritaAcara: true,
      },
    });

    if (!periode) {
      throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan');
    }

    if (!isStatusBolehBeritaAcara(periode.status)) {
      throw new AppError(
        'AKSI_TIDAK_VALID',
        400,
        'Berita acara hanya dapat diisi setelah hasil undian diunggah',
      );
    }

    let versionBaru = 1;

    if (periode.beritaAcara) {
      if (periode.beritaAcara.version !== input.version) {
        throw new AppError(
          'CONFLICT',
          409,
          'Data berita acara telah diubah oleh pengguna lain. Silakan segarkan halaman.',
        );
      }
      versionBaru = periode.beritaAcara.version + 1;

      await tx.beritaAcara.update({
        where: { id: periode.beritaAcara.id },
        data: {
          isi: {
            nomor: input.nomor,
            tempat: input.tempat,
            hariTanggal: input.hariTanggal,
            dasarKegiatan: input.dasarKegiatan,
            panitia: input.panitia,
            saksi: input.saksi,
          },
          version: versionBaru,
          updatedById: aktor.id,
        },
      });
    } else {
      await tx.beritaAcara.create({
        data: {
          periodeId,
          isi: {
            nomor: input.nomor,
            tempat: input.tempat,
            hariTanggal: input.hariTanggal,
            dasarKegiatan: input.dasarKegiatan,
            panitia: input.panitia,
            saksi: input.saksi,
          },
          version: versionBaru,
          updatedById: aktor.id,
        },
      });
    }

    await audit(tx, {
      aksi: 'BERITA_ACARA_UBAH',
      aktor: { id: aktor.id, username: aktor.username },
      targetTipe: 'PERIODE',
      targetId: periodeId,
      payload: {
        nomor: input.nomor,
        version: versionBaru,
        totalPanitia: input.panitia.length,
        totalSaksi: input.saksi.length,
      },
      konteks,
    });

    return {
      tersedia: true,
      nomor: input.nomor,
      tempat: input.tempat,
      hariTanggal: input.hariTanggal,
      dasarKegiatan: input.dasarKegiatan,
      panitia: input.panitia,
      saksi: input.saksi,
      version: versionBaru,
      updatedAt: new Date().toISOString(),
      updatedByNama: aktor.nama,
    };
  });
}

/**
 * Menghasilkan PDF Berita Acara resmi A4 dan mencatat audit download.
 */
export async function unduhPdfBeritaAcara(
  periodeId: string,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
): Promise<{ buffer: Buffer; namaFile: string }> {
  const db = getDb();

  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    include: {
      snapshot: true,
      hasilUndian: true,
      beritaAcara: true,
      wilayah: {
        orderBy: { kode: 'asc' },
      },
    },
  });

  if (!periode) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan');
  }

  if (!isStatusBolehBeritaAcara(periode.status)) {
    throw new AppError(
      'AKSI_TIDAK_VALID',
      400,
      'PDF Berita Acara hanya tersedia setelah hasil undian diunggah',
    );
  }

  const pemenangData = await ambilPemenangPeriode(periodeId);

  const isiBa = (periode.beritaAcara?.isi ?? {}) as {
    nomor?: string;
    tempat?: string;
    hariTanggal?: string;
    dasarKegiatan?: string;
    panitia?: PanitiaItem[];
    saksi?: SaksiItem[];
  };

  const jW1 = periode.snapshot?.jumlahW1 ?? 0;
  const jW2 = periode.snapshot?.jumlahW2 ?? 0;

  const rekapWilayah = periode.wilayah.map((w) => ({
    kode: w.kode,
    nama: w.nama,
    totalPeserta: w.kode === 'W1' ? jW1 : jW2,
  }));

  const totalPesertaSemua = rekapWilayah.reduce((acc, curr) => acc + curr.totalPeserta, 0);

  const pdfPayload: BeritaAcaraPdfData = {
    periode: {
      judul: periode.judul,
      tahunPbb: periode.tahunAkhir,
      status: periode.status,
      snapshotHash: periode.snapshot?.hash ?? null,
      hasilHash: periode.hasilUndian?.hasilHash ?? null,
    },
    beritaAcara: {
      nomor: isiBa.nomor ?? '',
      tempat: isiBa.tempat ?? '',
      hariTanggal: isiBa.hariTanggal ?? '',
      dasarKegiatan: isiBa.dasarKegiatan ?? '',
      panitia: Array.isArray(isiBa.panitia) ? isiBa.panitia : [],
      saksi: Array.isArray(isiBa.saksi) ? isiBa.saksi : [],
    },
    rekapWilayah,
    totalPesertaSemua,
    wilayahList: pemenangData.wilayah,
    tanggalCetak: new Date(),
  };

  const buffer = await buatPdfBeritaAcara(pdfPayload);

  await audit(db, {
    aksi: 'BERITA_ACARA_UNDUH',
    aktor: { id: aktor.id, username: aktor.username },
    targetTipe: 'PERIODE',
    targetId: periodeId,
    payload: {
      nomor: isiBa.nomor ?? '-',
      tahunPbb: periode.tahunAkhir,
    },
    konteks,
  });

  const namaFile = `Berita_Acara_Undian_${periode.tahunAkhir}_${periode.id.slice(-6)}.pdf`;
  return { buffer, namaFile };
}

/**
 * Menghasilkan Excel Pemenang dan mencatat audit.
 */
export async function unduhExcelPemenang(
  periodeId: string,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
): Promise<{ buffer: Buffer; namaFile: string }> {
  const db = getDb();
  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    select: { id: true, judul: true, tahunAkhir: true, status: true },
  });

  if (!periode) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan');
  }

  if (!isStatusBolehBeritaAcara(periode.status)) {
    throw new AppError('AKSI_TIDAK_VALID', 400, 'Daftar pemenang belum tersedia untuk diekspor');
  }

  const pemenangData = await ambilPemenangPeriode(periodeId);
  const buffer = await buatWorkbookPemenang(pemenangData.wilayah, periode.judul);

  await audit(db, {
    aksi: 'EKSPOR_UNDUH',
    aktor: { id: aktor.id, username: aktor.username },
    targetTipe: 'PERIODE',
    targetId: periodeId,
    payload: { tipe: 'PEMENANG' },
    konteks,
  });

  const namaFile = `Daftar_Pemenang_${periode.tahunAkhir}_${periode.id.slice(-6)}.xlsx`;
  return { buffer, namaFile };
}

/**
 * Menghasilkan Excel Log Audit dan mencatat audit.
 */
export async function unduhExcelAudit(
  periodeId: string,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
): Promise<{ buffer: Buffer; namaFile: string }> {
  const db = getDb();
  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    select: { id: true, judul: true, tahunAkhir: true },
  });

  if (!periode) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan');
  }

  const logs = await db.auditLog.findMany({
    where: {
      OR: [{ targetId: periodeId }, { targetTipe: 'PERIODE', targetId: periodeId }],
    },
    orderBy: { at: 'desc' },
    take: 1000,
  });

  const buffer = await buatWorkbookAudit(logs, periode.judul);

  await audit(db, {
    aksi: 'EKSPOR_UNDUH',
    aktor: { id: aktor.id, username: aktor.username },
    targetTipe: 'PERIODE',
    targetId: periodeId,
    payload: { tipe: 'AUDIT', jumlahBaris: logs.length },
    konteks,
  });

  const namaFile = `Log_Audit_${periode.tahunAkhir}_${periode.id.slice(-6)}.xlsx`;
  return { buffer, namaFile };
}
