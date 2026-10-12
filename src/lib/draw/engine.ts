import { SLOT_URUTAN } from '@/lib/package/kontrak';

import { secureRandomInt } from './random';
import {
  type HasilSlotUndian,
  type PesertaUndian,
  type StateUndian,
} from './types';

/**
 * Memilih satu pemenang secara acak kriptografis dari peserta wilayah
 * yang belum pernah terpilih pada slot mana pun sebelumnya (DECISIONS 003).
 */
export function pilihPemenang(
  pesertaWilayah: PesertaUndian[],
  pemenangTerpilihUrut: Set<number>,
  generatorAcak: (min: number, max: number) => number = secureRandomInt,
): PesertaUndian {
  if (pesertaWilayah.length < 3) {
    throw new Error('Pool wilayah kurang dari 3 peserta.');
  }

  const kandidat = pesertaWilayah.filter((p) => !pemenangTerpilihUrut.has(p.urut));
  if (kandidat.length === 0) {
    throw new Error('Semua peserta pada wilayah ini telah terpilih.');
  }

  const indeksAcak = generatorAcak(0, kandidat.length - 1);
  const terpilih = kandidat[indeksAcak];
  if (terpilih === undefined) {
    throw new Error('Gagal memilih peserta acak.');
  }

  return terpilih;
}

/**
 * Membuat state undian awal saat paket siap.
 */
export function buatStateAwal(): StateUndian {
  return {
    fase: 'MENUNGGU',
    slotAktifIndex: 0,
    slotSelesai: [],
    dimulaiAt: null,
    selesaiAt: null,
    catatanLokal: [],
  };
}

/**
 * Transisi: Operator menekan tombol Mulai pada slot aktif.
 */
export function mulaiSlot(state: StateUndian, waktuSekarang: string): StateUndian {
  if (state.fase !== 'MENUNGGU') {
    return state;
  }
  return {
    ...state,
    fase: 'MENGACAK',
    dimulaiAt: state.dimulaiAt ?? waktuSekarang,
  };
}

/**
 * Transisi: Operator menekan Berhenti, pemenang ditentukan dan disimpan.
 */
export function simpanPemenangSlot(
  state: StateUndian,
  pemenang: PesertaUndian,
  diundiAt: string,
): StateUndian {
  if (state.fase !== 'MENGACAK') {
    return state;
  }

  const slotBaku = SLOT_URUTAN[state.slotAktifIndex];
  if (slotBaku === undefined) {
    throw new Error('Indeks slot di luar rentang.');
  }

  const hasilSlot: HasilSlotUndian = {
    urutan: slotBaku.urutan,
    kode: slotBaku.kode,
    urut: pemenang.urut,
    diundiAt,
    pemenang,
  };

  const slotSelesaiBaru = [...state.slotSelesai, hasilSlot];
  const apakahSlotTerakhir = slotSelesaiBaru.length === 6;

  return {
    ...state,
    fase: 'PEMENANG',
    slotSelesai: slotSelesaiBaru,
    selesaiAt: apakahSlotTerakhir ? diundiAt : null,
  };
}

/**
 * Transisi: Lanjut ke slot berikutnya setelah kartu pemenang tampil.
 */
export function lanjutSlotBerikutnya(state: StateUndian): StateUndian {
  if (state.fase !== 'PEMENANG') {
    return state;
  }

  if (state.slotSelesai.length >= 6) {
    return {
      ...state,
      fase: 'SELESAI',
    };
  }

  return {
    ...state,
    slotAktifIndex: state.slotAktifIndex + 1,
    fase: 'MENUNGGU',
  };
}
