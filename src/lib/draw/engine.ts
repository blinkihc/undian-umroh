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
  if (pesertaWilayah.length < 1) {
    throw new Error('Pool wilayah kosong.');
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
  const apakahSlotTerakhir = slotSelesaiBaru.length === SLOT_URUTAN.length;

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

  if (state.slotSelesai.length >= SLOT_URUTAN.length) {
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

/**
 * Transisi: Operator membatalkan putaran saat fase MENGACAK karena salah pencet.
 * Mengembalikan fase ke MENUNGGU tanpa menentukan pemenang.
 */
export function batalkanPutaran(state: StateUndian): StateUndian {
  if (state.fase !== 'MENGACAK') {
    return state;
  }
  return {
    ...state,
    fase: 'MENUNGGU',
    dimulaiAt: state.slotSelesai.length === 0 ? null : state.dimulaiAt,
  };
}

/**
 * Transisi: Operator membatalkan pemenang pada slot aktif (fase PEMENANG)
 * karena salah pencet tombol Berhenti sebelum waktunya.
 * Menghapus pemenang slot terakhir dan mengembalikan fase ke MENUNGGU untuk slot yang sama.
 */
export function batalkanPemenangSlot(state: StateUndian): StateUndian {
  if (state.fase !== 'PEMENANG' || state.slotSelesai.length === 0) {
    return state;
  }
  const slotSelesaiBaru = state.slotSelesai.slice(0, -1);
  return {
    ...state,
    fase: 'MENUNGGU',
    slotSelesai: slotSelesaiBaru,
    selesaiAt: null,
  };
}

