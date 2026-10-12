import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { getEnv } from '@/config/env';
import { maskNop } from '@/lib/domain/nop';
import { isoWib } from '@/lib/domain/waktu';
import {
  SLOT_URUTAN_RESMI,
  verifikasiHasilMurni,
  type PesertaSnapshotInfo,
} from '@/lib/draw/verifikasi';
import { canonicalStringify } from '@/lib/package/hash';
import { type KodeSlotPaket } from '@/lib/package/kontrak';
import { audit } from '@/server/audit';
import { type PenggunaSesi } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { type KonteksRequest } from '@/server/request';
import { type KodeSlot, type Prisma } from '@/generated/prisma';

const MAP_KODE_SLOT_DB: Record<KodeSlotPaket, KodeSlot> = {
  'W1-UTAMA': 'W1_UTAMA',
  'W1-C1': 'W1_C1',
  'W1-C2': 'W1_C2',
  'W2-UTAMA': 'W2_UTAMA',
  'W2-C1': 'W2_C1',
  'W2-C2': 'W2_C2',
};

export interface SlotHasilRespons {
  kode: KodeSlotPaket;
  nopMasked: string;
  nama: string;
  kecamatan: string;
}

export interface HasilUnggahRespons {
  status: 'DIUNDI';
  hasilHash: string;
  slot: SlotHasilRespons[];
  version: number;
}

/**
 * Memproses unggahan file hasil undian, memverifikasi 10 tahapan,
 * dan menyimpan 6 slot pemenang ke basis data (API.md §4.5-4.6, UX_FLOWS Flow 11).
 */
export async function unggahDanVerifikasiHasil(
  periodeId: string,
  rawBody: unknown,
  aktor: PenggunaSesi,
  konteks?: KonteksRequest,
): Promise<HasilUnggahRespons> {
  const db = getDb();

  // 1. Ambil data periode, snapshot, snapshot_peserta, dan hasil yang mungkin sudah ada
  const periode = await db.periode.findUnique({
    where: { id: periodeId },
    include: {
      snapshot: {
        include: {
          peserta: {
            include: {
              peserta: {
                select: {
                  id: true,
                  nop: true,
                  nama: true,
                  kecamatan: true,
                },
              },
            },
          },
        },
      },
      hasilUndian: {
        include: {
          uploadedBy: {
            select: { nama: true },
          },
        },
      },
    },
  });

  if (periode === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Periode tidak ditemukan.');
  }

  // Jika sudah ada hasil undian untuk periode ini
  if (periode.hasilUndian !== null) {
    const infoWaktu = isoWib(periode.hasilUndian.uploadedAt);
    const infoAktor = periode.hasilUndian.uploadedBy.nama;
    await audit(
      {
        aksi: 'HASIL_DITOLAK',
        targetTipe: 'periode',
        targetId: periodeId,
        payload: {
          pemeriksaan: 'BELUM_ADA_HASIL',
          alasan: 'Sudah pernah diunggah',
        },
        konteks,
        aktor,
      },
      db,
    );
    throw new AppError(
      'HASIL_SUDAH_DIUNGGAH',
      409,
      `Hasil periode ini sudah diunggah pada ${infoWaktu} oleh ${infoAktor}. Unggahan ditolak.`,
      {
        uploadedAt: infoWaktu,
        uploadedBy: infoAktor,
      },
    );
  }

  // Periode harus dalam status TERKUNCI
  if (periode.status !== 'TERKUNCI' || periode.snapshot === null) {
    throw new AppError(
      'PERIODE_BUKAN_TERKUNCI',
      409,
      'Hasil undian hanya dapat diunggah untuk periode yang berstatus Terkunci.',
      { status: periode.status },
    );
  }

  // 2. Siapkan peta peserta dari snapshot
  const snapshotPesertaMap = new Map<number, PesertaSnapshotInfo>();
  const detailPesertaMap = new Map<
    number,
    { id: string; nop: string; nama: string; kecamatan: string }
  >();

  for (const sp of periode.snapshot.peserta) {
    snapshotPesertaMap.set(sp.urut, {
      id: sp.pesertaId,
      wilayah: sp.wilayah,
    });
    detailPesertaMap.set(sp.urut, {
      id: sp.peserta.id,
      nop: sp.peserta.nop,
      nama: sp.peserta.nama,
      kecamatan: sp.peserta.kecamatan,
    });
  }

  // 3. Jalankan 10 verifikasi murni
  const hasilVerifikasi = await verifikasiHasilMurni(rawBody, {
    periodeId,
    snapshotHash: periode.snapshot.hash,
    snapshotLockedAt: periode.snapshot.lockedAt,
    pesertaByUrut: snapshotPesertaMap,
    sudahAdaHasil: null,
  });

  if (!hasilVerifikasi.valid) {
    // Catat log audit HASIL_DITOLAK
    await audit(
      {
        aksi: 'HASIL_DITOLAK',
        targetTipe: 'periode',
        targetId: periodeId,
        payload: {
          pemeriksaan: hasilVerifikasi.kode,
          slot: hasilVerifikasi.slot,
          pesan: hasilVerifikasi.pesan,
        },
        konteks,
        aktor,
      },
      db,
    );

    if (hasilVerifikasi.kode === 'BELUM_ADA_HASIL') {
      throw new AppError(
        'HASIL_SUDAH_DIUNGGAH',
        409,
        hasilVerifikasi.pesan,
        hasilVerifikasi.details,
      );
    }

    throw new AppError('HASIL_TIDAK_VALID', 422, hasilVerifikasi.pesan, {
      pemeriksaan: hasilVerifikasi.kode,
      slot: hasilVerifikasi.slot,
      ...hasilVerifikasi.details,
    });
  }

  const validData = hasilVerifikasi.data;

  // 4. Transaksi basis data: simpan hasil dan 6 slot
  const hasilTransaksi = await db.$transaction(async (tx) => {
    // Double check apakah sudah ada hasil undian dalam transaksi
    const hasilLama = await tx.hasilUndian.findUnique({
      where: { periodeId },
      include: {
        uploadedBy: {
          select: { nama: true },
        },
      },
    });

    if (hasilLama !== null) {
      const infoWaktu = isoWib(hasilLama.uploadedAt);
      const infoAktor = hasilLama.uploadedBy.nama;
      throw new AppError(
        'HASIL_SUDAH_DIUNGGAH',
        409,
        `Hasil periode ini sudah diunggah pada ${infoWaktu} oleh ${infoAktor}. Unggahan ditolak.`,
        {
          uploadedAt: infoWaktu,
          uploadedBy: infoAktor,
        },
      );
    }

    const periodeTerkini = await tx.periode.findUniqueOrThrow({
      where: { id: periodeId },
      select: { id: true, status: true, version: true, slug: true },
    });

    if (periodeTerkini.status !== 'TERKUNCI') {
      throw new AppError(
        'PERIODE_BUKAN_TERKUNCI',
        409,
        'Status periode telah berubah.',
        { status: periodeTerkini.status },
      );
    }

    // Buat baris hasil_undian
    const hasilBaru = await tx.hasilUndian.create({
      data: {
        periodeId,
        hasilHash: validData.hasilHash,
        snapshotHash: validData.snapshotHash,
        isi: validData as unknown as Prisma.InputJsonValue,
        dimulaiAt: new Date(validData.dimulaiAt),
        selesaiAt: new Date(validData.selesaiAt),
        uploadedById: aktor.id,
        uploadedAt: new Date(),
      },
    });

    // Buat 6 baris slot_hasil
    for (const s of validData.slot) {
      const spInfo = snapshotPesertaMap.get(s.urut)!;
      const isUtama = s.kode.endsWith('-UTAMA');

      await tx.slotHasil.create({
        data: {
          hasilId: hasilBaru.id,
          periodeId,
          slot: MAP_KODE_SLOT_DB[s.kode],
          urutan: s.urutan,
          wilayah: spInfo.wilayah,
          snapshotUrut: s.urut,
          pesertaId: spInfo.id,
          diundiAt: new Date(s.diundiAt),
          status: isUtama ? 'MENANG' : 'CADANGAN',
          penerimaAktif: isUtama,
          version: 1,
        },
      });
    }

    // Perbarui status periode menjadi DIUNDI
    const periodeUpdate = await tx.periode.update({
      where: { id: periodeId },
      data: {
        status: 'DIUNDI',
        version: { increment: 1 },
      },
      select: {
        version: true,
      },
    });

    // Catat log audit HASIL_UNGGAH
    await audit(
      {
        aksi: 'HASIL_UNGGAH',
        targetTipe: 'hasil_undian',
        targetId: hasilBaru.id,
        payload: {
          periodeId,
          hasilHash: validData.hasilHash,
          snapshotHash: validData.snapshotHash,
          totalSlot: 6,
        },
        konteks,
        aktor,
      },
      tx,
    );

    return {
      hasilId: hasilBaru.id,
      version: periodeUpdate.version,
    };
  });

  // 5. Simpan salinan file asli ke STORAGE_DIR/hasil
  try {
    const storageDir = getEnv().STORAGE_DIR;
    const relFile = path.join(
      'hasil',
      `hasil-undian-${periode.slug}-${validData.hasilHash.slice(0, 8)}.json`,
    );
    const fullPath = path.join(storageDir, relFile);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, canonicalStringify(validData), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan arsip fisik file hasil undian ke storage:', err);
  }

  // 6. Susun slot ringkasan respons
  const slotRespons: SlotHasilRespons[] = validData.slot.map((s) => {
    const detail = detailPesertaMap.get(s.urut)!;
    return {
      kode: s.kode,
      nopMasked: maskNop(detail.nop),
      nama: detail.nama,
      kecamatan: detail.kecamatan,
    };
  });

  return {
    status: 'DIUNDI',
    hasilHash: validData.hasilHash,
    slot: slotRespons,
    version: hasilTransaksi.version,
  };
}
