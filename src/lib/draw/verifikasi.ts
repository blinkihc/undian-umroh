import { type KodeSlotPaket } from '@/lib/package/kontrak';
import {
  HasilUndianSchema,
  hitungHasilHash,
  type HasilUndianData,
  type HasilUndianTanpaHash,
} from './hasil';

export const SLOT_URUTAN_RESMI: readonly KodeSlotPaket[] = [
  'W1-UTAMA',
  'W1-C1',
  'W1-C2',
  'W2-UTAMA',
  'W2-C1',
  'W2-C2',
] as const;

export type KodePemeriksaanHasil =
  | 'FORMAT'
  | 'PERIODE'
  | 'SNAPSHOT_HASH'
  | 'HASIL_HASH'
  | 'SLOT_LENGKAP'
  | 'PESERTA_ADA'
  | 'WILAYAH_SESUAI'
  | 'PESERTA_UNIK'
  | 'WAKTU'
  | 'BELUM_ADA_HASIL';

export interface PesertaSnapshotInfo {
  id: string;
  wilayah: 'W1' | 'W2';
}

export interface HasilSudahAdaInfo {
  uploadedAt: string;
  uploadedByName: string;
}

export interface KonteksVerifikasiHasil {
  periodeId: string;
  snapshotHash: string;
  snapshotLockedAt: string | Date;
  pesertaByUrut: Map<number, PesertaSnapshotInfo>;
  sudahAdaHasil?: HasilSudahAdaInfo | null;
}

export type HasilVerifikasi =
  | {
      valid: true;
      data: HasilUndianData;
    }
  | {
      valid: false;
      kode: KodePemeriksaanHasil;
      pesan: string;
      slot?: KodeSlotPaket;
      details?: Record<string, unknown>;
    };

/**
 * 10 Pemeriksaan integritas hasil undian berurutan (API.md §4.6, UX_FLOWS Flow 11).
 * Berjalan murni di browser dan server.
 */
export async function verifikasiHasilMurni(
  inputData: unknown,
  konteks: KonteksVerifikasiHasil,
): Promise<HasilVerifikasi> {
  // 1. FORMAT
  const parsed = HasilUndianSchema.safeParse(inputData);
  if (!parsed.success) {
    return {
      valid: false,
      kode: 'FORMAT',
      pesan: 'File hasil tidak valid.',
      details: { errors: parsed.error.issues },
    };
  }

  const hasil = parsed.data;

  // 2. PERIODE
  if (hasil.periodeId !== konteks.periodeId) {
    return {
      valid: false,
      kode: 'PERIODE',
      pesan: 'File hasil bukan untuk periode ini.',
    };
  }

  // 3. SNAPSHOT_HASH
  if (hasil.snapshotHash !== konteks.snapshotHash) {
    return {
      valid: false,
      kode: 'SNAPSHOT_HASH',
      pesan: 'File hasil bukan untuk periode ini (hash data tidak cocok).',
    };
  }

  // 4. HASIL_HASH
  const { hasilHash, ...tanpaHash } = hasil;
  const hashKalkulasi = await hitungHasilHash(tanpaHash as HasilUndianTanpaHash);
  if (hasilHash !== hashKalkulasi) {
    return {
      valid: false,
      kode: 'HASIL_HASH',
      pesan: 'Isi file hasil telah diubah.',
    };
  }

  // 5. SLOT_LENGKAP
  if (hasil.slot.length !== 6) {
    return {
      valid: false,
      kode: 'SLOT_LENGKAP',
      pesan: 'Slot undian tidak lengkap atau urutannya salah.',
    };
  }

  for (let i = 0; i < 6; i++) {
    const s = hasil.slot[i];
    if (s.urutan !== i + 1 || s.kode !== SLOT_URUTAN_RESMI[i]) {
      return {
        valid: false,
        kode: 'SLOT_LENGKAP',
        pesan: 'Slot undian tidak lengkap atau urutannya salah.',
      };
    }
  }

  // 6. PESERTA_ADA
  for (let i = 0; i < 6; i++) {
    const s = hasil.slot[i];
    if (!konteks.pesertaByUrut.has(s.urut)) {
      return {
        valid: false,
        kode: 'PESERTA_ADA',
        pesan: `Peserta pada slot ${s.kode} tidak ditemukan di data terkunci.`,
        slot: s.kode,
      };
    }
  }

  // 7. WILAYAH_SESUAI
  for (let i = 0; i < 6; i++) {
    const s = hasil.slot[i];
    const peserta = konteks.pesertaByUrut.get(s.urut)!;
    const targetWilayah: 'W1' | 'W2' = s.kode.startsWith('W1') ? 'W1' : 'W2';
    const namaWilayah = targetWilayah === 'W1' ? 'Wilayah 1' : 'Wilayah 2';

    if (peserta.wilayah !== targetWilayah) {
      return {
        valid: false,
        kode: 'WILAYAH_SESUAI',
        pesan: `Peserta pada slot ${s.kode} bukan dari ${namaWilayah}.`,
        slot: s.kode,
      };
    }
  }

  // 8. PESERTA_UNIK
  const urutSet = new Set<number>();
  for (let i = 0; i < 6; i++) {
    const s = hasil.slot[i];
    if (urutSet.has(s.urut)) {
      return {
        valid: false,
        kode: 'PESERTA_UNIK',
        pesan: 'Peserta yang sama muncul di lebih dari satu slot.',
      };
    }
    urutSet.add(s.urut);
  }

  // 9. WAKTU
  const tDimulai = new Date(hasil.dimulaiAt).getTime();
  const tSelesai = new Date(hasil.selesaiAt).getTime();
  const tLockedAt = new Date(konteks.snapshotLockedAt).getTime();

  if (Number.isNaN(tDimulai) || Number.isNaN(tSelesai) || Number.isNaN(tLockedAt)) {
    return {
      valid: false,
      kode: 'WAKTU',
      pesan: 'Urutan waktu pengundian tidak valid atau sebelum data dikunci.',
    };
  }

  if (tDimulai > tSelesai || tDimulai < tLockedAt) {
    return {
      valid: false,
      kode: 'WAKTU',
      pesan: 'Urutan waktu pengundian tidak valid atau sebelum data dikunci.',
    };
  }

  let prevTime = tDimulai;
  for (let i = 0; i < 6; i++) {
    const s = hasil.slot[i];
    const tDiundi = new Date(s.diundiAt).getTime();
    if (Number.isNaN(tDiundi)) {
      return {
        valid: false,
        kode: 'WAKTU',
        pesan: 'Urutan waktu pengundian tidak valid atau sebelum data dikunci.',
      };
    }
    // Waktu diundi harus >= waktu slot sebelumnya (atau dimulaiAt) dan <= selesaiAt
    if (tDiundi < prevTime || tDiundi > tSelesai || tDiundi < tLockedAt) {
      return {
        valid: false,
        kode: 'WAKTU',
        pesan: 'Urutan waktu pengundian tidak valid atau sebelum data dikunci.',
      };
    }
    prevTime = tDiundi;
  }

  // 10. BELUM_ADA_HASIL
  if (konteks.sudahAdaHasil) {
    return {
      valid: false,
      kode: 'BELUM_ADA_HASIL',
      pesan: `Hasil periode ini sudah diunggah pada ${konteks.sudahAdaHasil.uploadedAt} oleh ${konteks.sudahAdaHasil.uploadedByName}. Unggahan ditolak.`,
      details: {
        uploadedAt: konteks.sudahAdaHasil.uploadedAt,
        uploadedBy: konteks.sudahAdaHasil.uploadedByName,
      },
    };
  }

  return {
    valid: true,
    data: hasil,
  };
}
